import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';

const memoActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateMemoActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log('SERVICE - GENERATE MEMO ACTIVTIY');

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
    console.log(chalk.yellow('💵 New sender wallet created: ', senderWallet.publicKey));

    for (const student of students) {
        console.log(chalk.blue(`\nStudent "${student.username}"`));

        const { wallet: studentWallet } = await client.fundWallet();
        memoActivity.wallets.push({
            username: student.username,
            pubKey: studentWallet.publicKey,
            prvKey: studentWallet.privateKey
        });
        console.log(chalk.blue(`💵 New student wallet: ${studentWallet.publicKey}`));

        const { wallet: solutionAccount } = await client.fundWallet();
        memoActivity.metaData.solutionAccounts.push({
            username: student.username,
            pubKey: solutionAccount.publicKey,
            prvKey: solutionAccount.privateKey
        });
        console.log(chalk.blue(`💵 New solution account: ${studentWallet.publicKey}`));

        const memo = `Send a transaction to your solution account: ${solutionAccount.classicAddress}`;
        console.log(chalk.grey('✏️ Memo about to be send: ', memo));
        const memoHex = convertStringToHex(memo);

        // Define the payment transaction details
        const transaction = await client.autofill({
            TransactionType: "Payment",
            Account: senderWallet.address,
            Amount: xrpToDrops("1"), // Base (minimum amount to activate the account)
            Destination: solutionAccount.classicAddress,
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
                console.log(`✅ Transaction successful for student "${student.username}" to his solution account ${solutionAccount.classicAddress}:`, result.result.hash);
            else
                console.error(`❌ Failed to send transaction for student "${student.username}":`, result.result.meta?.toString());
        } catch (error) {
            console.error(`❌ Failed to send transaction for student ${student.email}:`, error);
        }
    }

    await client.disconnect();

    return memoActivity;
}

async function watchMemoActivities() {
    // watch if the student sent the transaction and update the tx

}