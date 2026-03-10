/**
 * Dobbi's onboarding interview — a fun, interactive conversation
 * to learn about the user and personalise responses.
 *
 * Run automatically on first launch, or manually via `dobbi interview`.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { saveProfile } from '../state/manager.js';
import { loadCalConfig, saveCalConfig } from './cal.js';

// ─────────────────────────────────────────────────────────────────────────────
// DIALOGUE LINES
// ─────────────────────────────────────────────────────────────────────────────

const INTRO_LINES = [
    `\n🤖 ${chalk.cyan('*peeks out from behind a stack of scrolls*')}`,
    `\n   Oh! A new face! Dobbi is ${chalk.bold('so')} excited!`,
    `   Dobbi has never had a proper introduction, you see.`,
    `   ${chalk.gray('*clears throat and stands up very straight*')}\n`,
    `   Let Dobbi ask a few questions so Dobbi can serve you better!\n`,
];

const REACTIONS = {
    name: [
        (n: string) => `   ${chalk.cyan(`*bounces with joy*`)} What a wonderful name! ${chalk.bold(n)}! Dobbi will remember it forever!`,
        (n: string) => `   ${chalk.cyan(`*scribbles furiously on parchment*`)} ${chalk.bold(n)}... got it! Dobbi has excellent penmanship!`,
        (n: string) => `   ${chalk.cyan(`*whispers reverently*`)} ${chalk.bold(n)}... a fine name indeed!`,
    ],
    gender: [
        `   ${chalk.cyan(`*nods solemnly*`)} Noted! Dobbi will address you properly from now on.`,
        `   ${chalk.cyan(`*updates the scrolls*`)} Very good! Dobbi has made a note of it.`,
        `   ${chalk.cyan(`*bows respectfully*`)} Understood! Dobbi shall address you accordingly.`,
    ],
    work: [
        (w: string) => `   ${chalk.cyan(`*eyes go wide*`)} ${chalk.bold(w)}?! That sounds fascinating! Dobbi wishes he could do that too!`,
        (w: string) => `   ${chalk.cyan(`*adjusts spectacles*`)} Ah, ${chalk.bold(w)}! Dobbi has heard of such noble work!`,
        (w: string) => `   ${chalk.cyan(`*takes careful notes*`)} ${chalk.bold(w)}... Dobbi will keep this in mind when helping you!`,
    ],
    family: [
        () => `   ${chalk.cyan(`*wipes a tear*`)} How lovely! Dobbi is touched you shared that!`,
        () => `   ${chalk.cyan(`*clutches heart*`)} Family is important! Dobbi knows this well.`,
        () => `   ${chalk.cyan(`*smiles warmly*`)} Dobbi will remember this. Family context helps Dobbi help you!`,
    ],
    car: {
        yes: [
            `   ${chalk.cyan(`*pretends to drive*`)} Vroom vroom! Dobbi has always wanted to ride in one!`,
            `   ${chalk.cyan(`*nods approvingly*`)} A chariot of steel! Very practical, very practical.`,
        ],
        no: [
            `   ${chalk.cyan(`*nods wisely*`)} No car! Dobbi respects that. Dobbi gets everywhere by apparition anyway.`,
            `   ${chalk.cyan(`*taps chin*`)} Public transport or teleportation? Either way, Dobbi approves!`,
        ],
    },
    city_live: [
        (c: string) => `   ${chalk.cyan(`*pulls out a tiny map*`)} ${chalk.bold(c)}! Dobbi has heard stories about that place!`,
        (c: string) => `   ${chalk.cyan(`*marks it on his scroll*`)} ${chalk.bold(c)}... noted! Dobbi will factor this in.`,
    ],
    city_work: [
        (c: string) => `   ${chalk.cyan(`*calculates on fingers*`)} And you work in ${chalk.bold(c)}! Dobbi sees, Dobbi sees.`,
        (c: string) => `   ${chalk.cyan(`*draws a line on his map*`)} ${chalk.bold(c)} for work! Dobbi has the full picture now!`,
    ],
    cal_personal: [
        `   ${chalk.cyan(`*carefully copies the link*`)} Personal calendar! Dobbi will keep an eye on it!`,
        `   ${chalk.cyan(`*pins it to the notice board*`)} Splendid! Dobbi loves knowing what's coming up!`,
    ],
    cal_work: [
        `   ${chalk.cyan(`*files it under "important"*`)} Work calendar too! Dobbi will track both, sir!`,
        `   ${chalk.cyan(`*nods professionally*`)} Two calendars! Dobbi is very thorough.`,
    ],
};

const OUTRO_LINES = [
    `\n🤖 ${chalk.cyan(`*rolls up parchment and stores it carefully*`)}`,
    `   Splendid! Dobbi knows everything Dobbi needs to know!`,
    `   Dobbi is now ${chalk.bold('fully calibrated')} and ready to serve.`,
    `   ${chalk.gray(`(You can update your profile anytime with: dobbi interview)`)}\n`,
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pause(ms = 400): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
}

async function printLines(lines: string[]): Promise<void> {
    for (const line of lines) {
        console.log(line);
        await pause(300);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW FLOW
// ─────────────────────────────────────────────────────────────────────────────

export async function runInterview(): Promise<void> {
    await printLines(INTRO_LINES);

    // 1. Name
    const { name } = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: chalk.cyan('🤖 What is your name?'),
        validate: (v: string) => v.trim().length > 0 || 'Dobbi needs at least one letter!',
    }]);
    console.log(pick(REACTIONS.name)(name.trim()));
    await pause();

    // 2. Gender
    const { gender } = await inquirer.prompt([{
        type: 'list',
        name: 'gender',
        message: chalk.cyan('🤖 How does Dobbi see you?'),
        choices: [
            { name: 'Male', value: 'male' },
            { name: 'Female', value: 'female' },
            { name: 'Other', value: 'other' },
        ],
    }]);
    console.log(pick(REACTIONS.gender));
    await pause();

    // 3. Work type
    const { workType } = await inquirer.prompt([{
        type: 'input',
        name: 'workType',
        message: chalk.cyan('🤖 What kind of work do you do?'),
        default: '',
    }]);
    if (workType.trim()) {
        console.log(pick(REACTIONS.work)(workType.trim()));
        await pause();
    }

    // 4. Family situation
    const { familySituation } = await inquirer.prompt([{
        type: 'input',
        name: 'familySituation',
        message: chalk.cyan('🤖 Tell Dobbi about your family! (or press Enter to skip)'),
        default: '',
    }]);
    if (familySituation.trim()) {
        console.log(pick(REACTIONS.family)());
        await pause();
    }

    // 5. Car
    const { hasCar } = await inquirer.prompt([{
        type: 'confirm',
        name: 'hasCar',
        message: chalk.cyan('🤖 Do you have a car?'),
        default: true,
    }]);
    console.log(pick(hasCar ? REACTIONS.car.yes : REACTIONS.car.no));
    await pause();

    // 6. City live
    const { cityLive } = await inquirer.prompt([{
        type: 'input',
        name: 'cityLive',
        message: chalk.cyan('🤖 Where do you live? (city)'),
        default: '',
    }]);
    if (cityLive.trim()) {
        console.log(pick(REACTIONS.city_live)(cityLive.trim()));
        await pause();
    }

    // 7. City work
    const { cityWork } = await inquirer.prompt([{
        type: 'input',
        name: 'cityWork',
        message: chalk.cyan('🤖 Where do you work? (city, or Enter if same / remote)'),
        default: '',
    }]);
    if (cityWork.trim()) {
        console.log(pick(REACTIONS.city_work)(cityWork.trim()));
        await pause();
    }

    // 8. Personal Google Calendar ICS link
    const { personalCalUrl } = await inquirer.prompt([{
        type: 'input',
        name: 'personalCalUrl',
        message: chalk.cyan('🤖 Got a personal Google Calendar ICS link? (or Enter to skip)'),
        default: '',
    }]);
    if (personalCalUrl.trim()) {
        console.log(pick(REACTIONS.cal_personal));
        await pause();
    }

    // 9. Work Google Calendar ICS link
    const { workCalUrl } = await inquirer.prompt([{
        type: 'input',
        name: 'workCalUrl',
        message: chalk.cyan('🤖 And a work Google Calendar ICS link? (or Enter to skip)'),
        default: '',
    }]);
    if (workCalUrl.trim()) {
        console.log(pick(REACTIONS.cal_work));
        await pause();
    }

    // Save everything
    await saveProfile({
        userName: name.trim(),
        gender,
        workType: workType.trim() || undefined,
        familySituation: familySituation.trim() || undefined,
        hasCar,
        cityLive: cityLive.trim() || undefined,
        cityWork: cityWork.trim() || undefined,
        personalCalUrl: personalCalUrl.trim() || undefined,
        workCalUrl: workCalUrl.trim() || undefined,
    });

    // Auto-configure calendars from provided URLs
    const personalUrl = personalCalUrl.trim();
    const workUrl = workCalUrl.trim();
    if (personalUrl || workUrl) {
        const cfg = await loadCalConfig();
        if (personalUrl && !cfg.calendars.some(c => c.id === 'personal')) {
            cfg.calendars.push({ id: 'personal', name: 'Personal', url: personalUrl });
        }
        if (workUrl && !cfg.calendars.some(c => c.id === 'work')) {
            cfg.calendars.push({ id: 'work', name: 'Work', url: workUrl });
        }
        await saveCalConfig(cfg);
    }

    await printLines(OUTRO_LINES);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI COMMAND
// ─────────────────────────────────────────────────────────────────────────────

export const interviewCommand = new Command('interview')
    .description('Run (or re-run) the Dobbi onboarding interview')
    .action(async () => {
        await runInterview();
    });
