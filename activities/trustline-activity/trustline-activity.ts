import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';
import { delayInSec } from '../../utils';

const trustlineActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateTrustlineActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log(chalk.bgWhite('SERVICE - GENERATE MEMO ACTIVTIY'));

    const trustlineActivity: Activity = {
        id: "trustlineActivity" + trustlineActivities.length,
        name: activityName,
        description: activityDescription,
        content: "",
        wallets: [],
        grades: [],
        status: [],
        classrooms: [],
        metaData: {}
    };
    console.log(chalk.green('🧱 New trustline activity created: ', trustlineActivity.id));

    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: senderWallet } = await client.fundWallet();
    console.log(chalk.yellow('💵 New sender wallet created: ', senderWallet.classicAddress));

    const { wallet: solutionAccount } = await client.fundWallet();
    trustlineActivity.metaData.solutionAccounts.push({
        pubKey: solutionAccount.publicKey,
        prvKey: solutionAccount.privateKey,
        classicAddress: solutionAccount.classicAddress
    });
    console.log(chalk.blue(`💵 New solution account: ${solutionAccount.classicAddress}`));


    for (const student of students) {
        console.log(chalk.blue(`\nStudent "${student.username}"`));

        const { wallet: studentWallet } = await client.fundWallet();
        trustlineActivity.wallets.push({
            username: student.username,
            pubKey: studentWallet.publicKey,
            prvKey: studentWallet.privateKey,
            seed: studentWallet.seed,
            classicAddress: studentWallet.classicAddress
        });
        console.log(chalk.blue(`💵 New student wallet: ${studentWallet.classicAddress}`));
    }

    await client.disconnect();

    trustlineActivities.push(trustlineActivity);
    return trustlineActivity;
}

export async function watchTrustlineActivities() {
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    while (true) {
        for (const trustlineActivity of trustlineActivities) {

            const solutionAccount = trustlineActivity.metaData.solutionAccount;

            for (const studentWalletData of trustlineActivity.wallets) {

                if (studentWalletData && studentWalletData.seed) {
                    try {
                        const transactions = await client.request({
                            command: "account_tx",
                            account: solutionAccount.classicAddress,
                            ledger_index_min: -1,
                            ledger_index_max: -1,
                            binary: false,
                            limit: 5,
                            forward: false,
                        });

                        const txs = transactions.result.transactions;

                        if (txs && txs.length > 0) {
                            const found = txs.find(tx => {
                                return (
                                    tx.tx_json?.TransactionType === "TrustSet"
                                );
                            });

                            if (found) {
                                console.log(chalk.green(`✅ Found incoming payment to solution account for student "${studentWalletData.username}"`));

                                const studentStatus = trustlineActivity.status.find(s => s.username === studentWalletData.username);
                                if (!studentStatus) {
                                    trustlineActivity.status.push({
                                        username: studentWalletData.username,
                                        status: "Done",
                                        txHash: found.tx ? found.hash : undefined
                                    });
                                } else {
                                    studentStatus.status = "Done";
                                    studentStatus.txHash = found.hash;
                                }

                                await client.disconnect();
                                return;
                            }
                        }
                    } catch (error) {
                        console.error(chalk.red(`❌ Error checking transactions for ${studentWalletData.username}`), error);
                    }

                    const studentWallet = Wallet.fromSeed(studentWalletData.seed);
                    console.log(`Recover student "${studentWalletData.username}" wallet: ${studentWallet.classicAddress}`);
                    const transaction = await client.autofill({
                        TransactionType: "Payment",
                        Account: studentWallet.address,
                        Amount: xrpToDrops("1"), // Base (minimum amount to activate the account)
                        Destination: studentWalletData.classicAddress,
                    });

                    try {
                        const result = await client.submitAndWait(transaction, { wallet: studentWallet });
                        if (result.result.validated)
                            console.log(`✅ Transaction successful for student "${studentWalletData.username}" to his account:`, result.result.hash);
                        else
                            console.error(`❌ Failed to send transaction for student "${studentWalletData.username}":`, result.result.meta?.toString());
                    } catch (error) {
                        console.error(`❌ Failed to send transaction for student ${studentWalletData.username}:`, error);
                    }
                } else {
                    throw Error('Impossible to find the student wallet');
                }
            }
            console.log(chalk.grey('No tx found...'));
            await delayInSec(5, true);
        }
    }
}