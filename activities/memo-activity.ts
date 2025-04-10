import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import { Activity } from './activity';
import { User } from '../students';

const memoActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateMemoActivity(activityName: string, activityDescription: string, students: User[]): Activity {

    const memoActivity: Activity = {
        id: "memoActiv" + memoActivities.length,
        name: activityName,
        description: activityDescription,
        content: "",
        wallets: [],
        grades: [],
        status: [],
        classrooms: [],
    };

    for (const student of students) {
        const client = new Client("wss://s.altnet.rippletest.net:51233");
        await client.connect();

        const { wallet: senderWallet } = await client.fundWallet();

        if (solutionAccount) {
            const memo = `Stage ${stage}: Send a transaction to your solution account: ${solutionAccount.classicAddress}`;
            const memoHex = convertStringToHex(memo);

            // Define the payment transaction details
            const transaction = await client.autofill({
                TransactionType: "Payment",
                Account: senderWallet.address,
                Amount: xrpToDrops("1"), // Base (minimum amount to activate the account)
                Destination: student.account.classicAddress,
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
                    console.log(`Transaction successful for student ${student.email} at stage ${stage}:`, result.result.hash);
                else
                    console.error(`Failed to send transaction for student ${student.email} at stage ${stage}:`, result.result.meta?.toString());
            } catch (error) {
                console.error(`Failed to send transaction for student ${student.email} at stage ${stage}:`, error);
            }
        }

        await client.disconnect();

        return memoActivity; 
    }
}

async function watchMemoActivity() {

}