import { Client, Wallet, xrpToDrops, convertStringToHex, verifySignature } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';
import { delayInSec } from '../../utils';

const cryptoActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateCryptoActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log(chalk.bgWhite('SERVICE - GENERATE CRYPTOGRAPHIC ACTIVTIY'));

    const cryptoActivity: Activity = {
        id: "cryptoActivity" + cryptoActivities.length,
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

    console.log(chalk.green('🧱 New crypto activity created: ', cryptoActivity.id));

    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    // Sender account -- no need to save this account
    const { wallet: senderWallet } = await client.fundWallet();
    console.log(chalk.yellow('💵 New sender wallet created: ', senderWallet.classicAddress));

    for (const student of students) {
        console.log(chalk.blue(`\nStudent "${student.username}"`));

        // Student account
        const { wallet: studentWallet } = await client.fundWallet();
        cryptoActivity.wallets.push({
            username: student.username,
            pubKey: studentWallet.publicKey,
            prvKey: studentWallet.privateKey,
            seed: studentWallet.seed,
            classicAddress: studentWallet.classicAddress
        });
        console.log(chalk.blue(`💵 New student wallet: ${studentWallet.classicAddress}`));

        // SENDER ACCOUNTS

        // Solution account
        const { wallet: solutionAccount } = await client.fundWallet();
        cryptoActivity.metaData.solutionAccounts.push({
            username: student.username,
            pubKey: solutionAccount.publicKey,
            prvKey: solutionAccount.privateKey,
            classicAddress: solutionAccount.classicAddress,
            amountToSend: 1.2
        });
        console.log(chalk.blue(`💵 New solution account: ${solutionAccount.classicAddress}`));

        const txBlobMessages: string[] = [];

        {
            const message = `Please send me 1.2 XRP.`;
            const messageHex = convertStringToHex(message);

            // Define the payment transaction details
            const solutionTx = await client.autofill({
                TransactionType: "Payment",
                Account: senderWallet.address,
                Amount: xrpToDrops("0.1"), // Base (minimum amount to activate the account)
                Destination: studentWallet.address,
                Memos: [
                    {
                        Memo: {
                            MemoData: messageHex
                        }
                    }
                ]
            });

            const solutionTxSigned = solutionAccount.sign(solutionTx);
            txBlobMessages.push(solutionTxSigned.tx_blob);
        }

        for (let i = 0; i < 2; i++) {
            const message = `Please send me 1.2 XRP.`;
            const messageHex = convertStringToHex(message);

            const { wallet: fakeAccount } = await client.fundWallet();

            const fakeTx = await client.autofill({
                TransactionType: "Payment",
                Account: fakeAccount.address,
                Amount: xrpToDrops("0.1"), // Base (minimum amount to activate the account)
                Destination: studentWallet.address,
                Memos: [
                    {
                        Memo: {
                            MemoData: messageHex
                        }
                    }
                ]
            });

            const fakeTxSigned = solutionAccount.sign(fakeTx);
            txBlobMessages.push(fakeTxSigned.tx_blob);
        }

        // Excepted to work
        // if(verifySignature(instructionSigned.tx_blob, solutionAccount.publicKey)) {
        //     console.log('You have found the right message ✅');
        // } else {
        //     console.log('This is not the correct message ❌');
        // }

        const blobList = txBlobMessages.map((blob, i) => `- ${blob}`).join('\n');
        const instruction = `Blobs:\n${blobList}
        \n\nPublic key to use: ${solutionAccount.publicKey}`;
        const instructionHex = convertStringToHex(instruction);

        // use verifySignature() or decode() from the xrpl library

        const instructionTx = await client.autofill({
            TransactionType: "Payment",
            Account: senderWallet.address,
            Amount: xrpToDrops("0.1"), // Base (minimum amount to activate the account)
            Destination: studentWallet.address,
            Memos: [
                {
                    Memo: {
                        MemoData: instructionHex
                    }
                }
            ]
        });

        try {
            const result = await client.submitAndWait(instructionTx, { wallet: senderWallet });
            if (result.result.validated)
                console.log(`✅ Transaction sent:`, result.result.hash);
            else
                console.error(`❌ Failed to send transaction:`, result.result.meta?.toString());
        } catch (error) {
            console.error(`❌ Failed to send transaction:`, error);
        }
    }

    await client.disconnect();

    cryptoActivities.push(cryptoActivity);
    return cryptoActivity;
}

export async function watchCryptoActivities() {
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    while (true) {
        for (const memoActivity of cryptoActivities) {
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
                                    // && tx.tx_json.Amount === xrpToDrops(solutionAccountData.amountToSend)
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
                        Amount: xrpToDrops(solutionAccountData.amountToSend), // Base (minimum amount to activate the account)
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
        await delayInSec(5, true);
    }
}