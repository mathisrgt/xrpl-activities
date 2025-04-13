import { Client, Wallet, xrpToDrops, convertStringToHex, SignerListSet, Transaction, multisign } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';
import { delayInSec } from '../../utils';


const collabMultisigActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateCollabMultisigActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log(chalk.bgWhite('SERVICE - GENERATE COLLAB MULTISIG ACTIVTIY'));

    if (students.length < 3) throw Error('At least 3 students required to launch a collab activity');

    const collabMultisigActivity: Activity = {
        id: "collabMultisigActivity" + collabMultisigActivities.length,
        name: activityName,
        description: activityDescription,
        content: "",
        wallets: [],
        grades: [],
        status: [],
        classrooms: [],
        metaData: {
            groups: []
        }
    };
    console.log(chalk.green('🧱 New collab multisig activity created: ', collabMultisigActivity.id));

    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();


    // Step 1: Generate a wallet for each student
    for (const student of students) {
        console.log(chalk.blue(`\nStudent "${student.username}"`));

        const { wallet: studentWallet } = await client.fundWallet();
        collabMultisigActivity.wallets.push({
            username: student.username,
            pubKey: studentWallet.publicKey,
            prvKey: studentWallet.privateKey,
            seed: studentWallet.seed,
            classicAddress: studentWallet.classicAddress
        });

        // TODO: Can be deleted, already stored in wallets 
        //  - find a deterministic way to create groups
        //  - handle students activity management
        collabMultisigActivity.metaData.groups.push({
            students: [{
                username: student.username,
                classicAddress: studentWallet.classicAddress
            }],
            solutionAccount: undefined
        });
        console.log(chalk.blue(`💵 New student wallet: ${studentWallet.classicAddress}`));
    }

    // TODO: Send a memo with the others signers of their group

    // Student signer 1 send the multisig account tx
    // console.log("student wallet data: ", studentWalletData);

    const { wallet: solutionAccount } = await client.fundWallet();
    collabMultisigActivity.metaData.groups[0].solutionAccount = {
        pubKey: solutionAccount.publicKey,
        prvKey: solutionAccount.privateKey,
        classicAddress: solutionAccount.classicAddress
    };
    console.log(chalk.blue(`💵 New solution account for group ${"0"}: ${solutionAccount.classicAddress}`));

    // Activity action simulation

    const student0seed = collabMultisigActivity.wallets[0].seed;
    const student0address = collabMultisigActivity.wallets[0].classicAddress;
    const student1address = collabMultisigActivity.wallets[1].classicAddress;
    const student2address = collabMultisigActivity.wallets[2].classicAddress;

    if (student0seed && student0address && student1address && student2address) {
        const student0Wallet = Wallet.fromSeed(student0seed);
        const { wallet: multisigAccount } = await client.fundWallet();

        console.log(`\nYour team: \n${chalk.grey("- " + student0address)}\n ${chalk.yellow("- " + student1address)}\n ${chalk.yellow("- " + student2address)}`);
        console.log(`\nMultisig account: ${chalk.red(multisigAccount.address)}`);

        const signerListTx: SignerListSet = {
            TransactionType: "SignerListSet",
            Account: multisigAccount.classicAddress,
            SignerQuorum: 3,
            SignerEntries: [
                { SignerEntry: { Account: student0address, SignerWeight: 1 } },
                { SignerEntry: { Account: student1address, SignerWeight: 1 } },
                { SignerEntry: { Account: student2address, SignerWeight: 1 } },
            ],
            Fee: "30000",
        }

        console.dir(signerListTx, { depth: null });

        const result = await client.submitAndWait(signerListTx, { wallet: multisigAccount })
        console.log(`📝 Signer list set. Tx hash: ${result.result.hash}`)
        console.log("Result status: ", result.status);

        // Prepare a multisig transaction (send 10 XRP to someone)
        const paymentTx = await client.autofill({
            TransactionType: 'Payment',
            Account: multisigAccount.classicAddress,
            Destination: solutionAccount.classicAddress,
            Amount: xrpToDrops('10')
        })

        delayInSec(10);

        // Activity action simulation - Each signer signs the transaction
        // -> retrieve each wallet

        const student1seed = collabMultisigActivity.wallets[1].seed;
        const student2seed = collabMultisigActivity.wallets[2].seed;



        if (student1seed && student2seed) {
            const student0Wallet = Wallet.fromSeed(student0seed);
            const student1Wallet = Wallet.fromSeed(student1seed);
            const student2Wallet = Wallet.fromSeed(student2seed);

            const { tx_blob: tx_blob0 } = student0Wallet.sign(paymentTx, true);
            const { tx_blob: tx_blob1 } = student1Wallet.sign(paymentTx, true);
            const { tx_blob: tx_blob2 } = student2Wallet.sign(paymentTx, true);

            // Combine into multisigned blob

            // updated example
            //             const accountSetTx = await client.autofill(accountSet, 2)
            //   console.log('AccountSet transaction is ready to be multisigned:')
            //   console.log(accountSetTx)
            //   const { tx_blob: tx_blob1 } = wallet1.sign(accountSetTx, true)
            //   const { tx_blob: tx_blob2 } = wallet2.sign(accountSetTx, true)
            //   const multisignedTx = multisign([tx_blob1, tx_blob2])
            //   const submitResponse = await client.submit(multisignedTx)

            // const multisigned = {
            //     ...paymentTx,
            //     Signers: [
            //         signed0.tx_json.Signers[0],
            //         signed1.tx_json.Signers[0],
            //         signed2.tx_json.Signers[0]
            //     ],
            //     SigningPubKey: ''
            // }

            const multisignedTx = multisign([tx_blob0, tx_blob1, tx_blob2])
            const submitResult = await client.submit(multisignedTx);
            console.log('Multisig tx submitted: ', submitResult.result.engine_result);
            if(submitResult.status === 'success') {
                console.log(`✅ Multisigned payment sent!`);
            }
        } else {
            throw Error(`❌ One of them missing: student1seed - student2seed`)
        }
    } else {
        throw Error('❌ One of them missing: student0seed - student1address - student2address')
    }

    await client.disconnect();

    collabMultisigActivities.push(collabMultisigActivity);
    return collabMultisigActivity;
}

export async function watchCollabMultisigActivities() {
    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    while (true) {
        for (const collabMultisigActivity of collabMultisigActivities) {
            for (const solutionAccountData of collabMultisigActivity.metaData.solutionAccounts) {
                // TODO watcher
                // try {
                //     const transactions = await client.request({
                //         command: "account_tx",
                //         account: solutionAccountData.classicAddress,
                //         ledger_index_min: -1,
                //         ledger_index_max: -1,
                //         binary: false,
                //         limit: 5,
                //         forward: false,
                //     });

                //     const txs = transactions.result.transactions;

                //     if (txs && txs.length > 0) {
                //         const found = txs.find(tx => {
                //             return (
                //                 tx.tx_json?.TransactionType === "Payment" &&
                //                 tx.tx_json.Account === studentWalletData.classicAddress &&
                //                 tx.tx_json.Destination === solutionAccountData.classicAddress
                //             );
                //         });

                //         if (found) {
                //             console.log(chalk.green(`✅ Found incoming payment to solution account for student "${solutionAccountData.username}"`));

                //             const studentStatus = memoActivity.status.find(s => s.username === solutionAccountData.username);
                //             if (!studentStatus) {
                //                 memoActivity.status.push({
                //                     username: solutionAccountData.username,
                //                     status: "Done",
                //                     txHash: found.tx ? found.hash : undefined
                //                 });
                //             } else {
                //                 studentStatus.status = "Done";
                //                 studentStatus.txHash = found.hash;
                //             }

                //             await client.disconnect();
                //             return;
                //         }
                //     }
                // } catch (error) {
                //     console.error(chalk.red(`❌ Error checking transactions for ${solutionAccountData.username}`), error);
                // }
            }
        }
        console.log(chalk.grey('No tx found...'));
        await delayInSec(5);
    }
}