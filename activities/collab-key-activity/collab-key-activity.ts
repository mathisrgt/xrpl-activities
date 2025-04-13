import { Client, Wallet, xrpToDrops, convertStringToHex } from 'xrpl';
import chalk from 'chalk';
import { Activity } from '../activity';
import { User } from '../../students';
import { delayInSec } from '../../utils';

const collabKeyActivities: Activity[] = [];

// Generate the activity for the students in parameters
/**
 * @param {User[]} students - The students involved in the memo activity.
 * @returns {Activity} The memo activity generated.
 */
export async function generateCollabKeyActivity(activityName: string, activityDescription: string, students: User[]): Promise<Activity> {
    console.log(chalk.bgWhite('SERVICE - GENERATE COLLAB KEY ACTIVTIY'));

    if(students.length < 3) {
        throw Error('At least 3 students needs to be registred to lauch the collab key activity');
    }
    
    const collabKeyActivity: Activity = {
        id: "collabKeyActivity" + collabKeyActivities.length,
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
    console.log(chalk.green('🧱 New collab key activity created: ', collabKeyActivity.id));

    const client = new Client("wss://s.devnet.rippletest.net:51233/");
    await client.connect();

    // TODO

    return collabKeyActivity;
}