import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';
import { delayInSec } from '../../utils';

const tracingActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateTracingActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log(chalk.bgWhite('SERVICE - GENERATE TRACING ACTIVTIY'));

    const tracingActivity: Activity = {
        id: "tracingActivity" + tracingActivities.length,
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
    console.log(chalk.green('🧱 New tracing activity created: ', tracingActivity.id));

    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    for (const student of students) {
        console.log(chalk.blue(`\nStudent "${student.username}"`));

        const { wallet: studentWallet } = await client.fundWallet();
        tracingActivity.wallets.push({
            username: student.username,
            pubKey: studentWallet.publicKey,
            prvKey: studentWallet.privateKey,
            seed: studentWallet.seed,
            classicAddress: studentWallet.classicAddress
        });
        console.log(chalk.blue(`💵 New student wallet: ${studentWallet.classicAddress}`));

        for(let i = 0; i < 4; i++) {
            const { wallet: randomWallet } = await client.fundWallet();
            const randomXRPamount = (Math.floor(Math.random() * 11) + 1).toString();

            const transaction = await client.autofill({
                TransactionType: "Payment",
                Account: studentWallet.address,
                Amount: xrpToDrops(randomXRPamount),
                Destination: randomWallet.address
            });

            try {
                const result = await client.submitAndWait(transaction, { wallet: studentWallet });
                if (result.result.validated)
                    console.log(`✅ Random tx successful for student "${student.username}":`, result.result.hash);
                else
                    console.error(`❌ Failed to send a random tx for student "${student.username}":`, result.result.meta?.toString());
            } catch (error) {
                console.error(`❌ Failed to send a random tx for student ${student.email}:`, error);
            }
        }

        const { wallet: solutionAccount } = await client.fundWallet();
        tracingActivity.metaData.solutionAccounts.push({
            username: student.username,
            pubKey: solutionAccount.publicKey,
            prvKey: solutionAccount.privateKey,
            classicAddress: solutionAccount.classicAddress
        });
        console.log(chalk.blue(`💵 New solution account: ${solutionAccount.classicAddress}`));

        const transaction = await client.autofill({
            TransactionType: "Payment",
            Account: studentWallet.classicAddress,
            Amount: xrpToDrops("12"),
            Destination: solutionAccount.address
        });

        try {
            const result = await client.submitAndWait(transaction, { wallet: studentWallet });
            if (result.result.validated)
                console.log(`✅ Transaction successful for student "${student.username}":`, result.result.hash);
            else
                console.error(`❌ Failed to send transaction for student "${student.username}":`, result.result.meta?.toString());
        } catch (error) {
            console.error(`❌ Failed to send transaction for student ${student.email}:`, error);
        }

        for(let i = 0; i < 4; i++) {
            const { wallet: randomWallet } = await client.fundWallet();
            const randomXRPamount = (Math.floor(Math.random() * 11) + 1).toString();

            const transaction = await client.autofill({
                TransactionType: "Payment",
                Account: studentWallet.address,
                Amount: xrpToDrops(randomXRPamount),
                Destination: randomWallet.address
            });

            try {
                const result = await client.submitAndWait(transaction, { wallet: studentWallet });
                if (result.result.validated)
                    console.log(`✅ Random tx successful for student "${student.username}":`, result.result.hash);
                else
                    console.error(`❌ Failed to send a random tx for student "${student.username}":`, result.result.meta?.toString());
            } catch (error) {
                console.error(`❌ Failed to send a random tx for student ${student.email}:`, error);
            }
        }
    }

    console.log(chalk.bgCyan("Send a payment to the address that received the biggest XRP amount in your transaction history."));

    await client.disconnect();

    tracingActivities.push(tracingActivity);
    return tracingActivity;
}

export async function watchTracingActivities() {
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    while (true) {
        for (const tracingActivity of tracingActivities) {
            for (const solutionAccountData of tracingActivity.metaData.solutionAccounts) {

                const studentWalletData = tracingActivity.wallets.find((wallet) => wallet.username === solutionAccountData.username);
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

                                const studentStatus = tracingActivity.status.find(s => s.username === solutionAccountData.username);
                                if (!studentStatus) {
                                    tracingActivity.status.push({
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