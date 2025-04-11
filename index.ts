import readline from 'readline';
import { students } from './activities/data';
import { generateMemoActivity, watchMemoActivities } from './activities/memo-activity/memo-activity';
import chalk from 'chalk';

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
    } else {
        console.log(chalk.grey('\n👋 Exiting...'));
        process.exit(0);
    }
}

main();
