import chalk from "chalk";

export async function delayInSec(sec: number, display?: boolean): Promise<void> {
    if(display) console.log(chalk.grey(`⏳ Wait: ${sec}s`));
    return new Promise(resolve => setTimeout(resolve, sec * 1000));
}
