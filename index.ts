import readline from 'readline';
import { students } from './activities/data';
import { generateMemoActivity, watchMemoActivities } from './activities/memo-activity/memo-activity';
import chalk from 'chalk';
import { generateCollabMultisigActivity, watchCollabMultisigActivities } from './activities/collab-mutlisig-activity/collab-multisig-activity';

async function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    console.log(chalk.blueBright(`🎓 Choose an activity:`));
    console.log(` 1 - Memo`);
    console.log(` 2 - Collab - MultiSig`);
    console.log(` 0 - Exit\n`);

    const choice = await promptUser('Enter your choice: ');

    if (choice === '1') {
        console.log(chalk.yellow('\n🛠️  Generating memo activity...'));

        await generateMemoActivity(
            "IE Madrid - Workshop Tech.",
            "Technical workshop for business students from IE Madrid",
            students
        );

        console.log(chalk.green('\n📡 Watching for memo activity responses...'));
        await watchMemoActivities();
    }
    else if (choice === '2') {
        console.log(chalk.green('\n📡 Watching for collab multisig activity responses...'));
        watchCollabMultisigActivities();

        console.log(chalk.yellow('\n🛠️  Generating collab multisig activity...'));
        await generateCollabMultisigActivity(
            "IE Madrid - Workshop Tech.",
            "Technical workshop for business students from IE Madrid",
            students
        );
    } else {
        console.log(chalk.grey('\n👋 Exiting...'));
        process.exit(0);
    }
}

main();
