import chalk from "chalk";

export async function delayInSec(sec: number): Promise<void> {
    console.log(chalk.grey(`⏳ Wait: ${sec}s`));
    return new Promise(resolve => setTimeout(resolve, sec * 1000));
}
