import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';
import { delayInSec } from '../../utils';

const memoActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateMemoActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log(chalk.bgWhite('SERVICE - GENERATE MEMO ACTIVTIY'));

    const memoActivity: Activity = {
        id: "memoActivity" + memoActivities.length,
        name: activityName,
        description: activityDescription,
        content: "",
        wallets: [],
        grades: [],
        status: [],
        classrooms: [],
        metaData: {
            solutionAccounts: []
        }
    };
    console.log(chalk.green('🧱 New memo activity created: ', memoActivity.id));

    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    const { wallet: senderWallet } = await client.fundWallet();
    console.log(chalk.yellow('💵 New sender wallet created: ', senderWallet.classicAddress));

    for (const student of students) {
        console.log(chalk.blue(`\nStudent "${student.username}"`));

        const { wallet: studentWallet } = await client.fundWallet();
        memoActivity.wallets.push({
            username: student.username,
            pubKey: studentWallet.publicKey,
            prvKey: studentWallet.privateKey,
            seed: studentWallet.seed,
            classicAddress: studentWallet.classicAddress
        });
        console.log(chalk.blue(`💵 New student wallet: ${studentWallet.classicAddress}`));

        const { wallet: solutionAccount } = await client.fundWallet();
        memoActivity.metaData.solutionAccounts.push({
            username: student.username,
            pubKey: solutionAccount.publicKey,
            prvKey: solutionAccount.privateKey,
            classicAddress: solutionAccount.classicAddress
        });
        console.log(chalk.blue(`💵 New solution account: ${solutionAccount.classicAddress}`));

        const memo = `Send a transaction to your solution account: ${solutionAccount.classicAddress}`;
        console.log(chalk.grey('📝 Memo about to be send: ', memo));
        const memoHex = convertStringToHex(memo);

        // Define the payment transaction details
        const transaction = await client.autofill({
            TransactionType: "Payment",
            Account: senderWallet.address,
            Amount: xrpToDrops("1"), // Base (minimum amount to activate the account)
            Destination: studentWallet.classicAddress,
            Memos: [
                {
                    Memo: {
                        MemoData: memoHex
                    }
                }
            ]
        });

        try {
            const result = await client.submitAndWait(transaction, { wallet: senderWallet });
            if (result.result.validated)
                console.log(`✅ Transaction successful for student "${student.username}":`, result.result.hash);
            else
                console.error(`❌ Failed to send transaction for student "${student.username}":`, result.result.meta?.toString());
        } catch (error) {
            console.error(`❌ Failed to send transaction for student ${student.email}:`, error);
        }
    }

    await client.disconnect();

    memoActivities.push(memoActivity);
    return memoActivity;
}

export async function watchMemoActivities() {
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    while (true) {
        for (const memoActivity of memoActivities) {
            for (const solutionAccountData of memoActivity.metaData.solutionAccounts) {

                const studentWalletData = memoActivity.wallets.find((wallet) => wallet.username === solutionAccountData.username);
                // console.log("student wallet data: ", studentWalletData);
                
                if (studentWalletData && studentWalletData.seed) {
                    try {
                        const transactions = await client.request({
                            command: "account_tx",
                            account: solutionAccountData.classicAddress,
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
                                    tx.tx_json?.TransactionType === "Payment" &&
                                    tx.tx_json.Account === studentWalletData.classicAddress &&
                                    tx.tx_json.Destination === solutionAccountData.classicAddress
                                );
                            });

                            if (found) {
                                console.log(chalk.green(`✅ Found incoming payment to solution account for student "${solutionAccountData.username}"`));

                                const studentStatus = memoActivity.status.find(s => s.username === solutionAccountData.username);
                                if (!studentStatus) {
                                    memoActivity.status.push({
                                        username: solutionAccountData.username,
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
                        console.error(chalk.red(`❌ Error checking transactions for ${solutionAccountData.username}`), error);
                    }

                    const studentWallet = Wallet.fromSeed(studentWalletData.seed);
                    console.log(`Recover student "${solutionAccountData.username}" wallet: ${studentWallet.classicAddress}`);
                    const transaction = await client.autofill({
                        TransactionType: "Payment",
                        Account: studentWallet.address,
                        Amount: xrpToDrops("1"), // Base (minimum amount to activate the account)
                        Destination: solutionAccountData.classicAddress,
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
        }
        console.log(chalk.grey('No tx found...'));
        await delayInSec(5);
    }
}