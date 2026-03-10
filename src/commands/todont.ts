// ─────────────────────────────────────────────────────────────────────────────
// TODONT COMMAND
// Things to avoid — "always" or during a time window.
// ─────────────────────────────────────────────────────────────────────────────

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import { promises as fs } from 'fs';
import { getVaultRoot } from '../state/manager.js';
import {
    generateEntityId,
    ensureEntityDir,
    findEntityByTitle,
    trashEntity,
    parseEntity,
    getEntityDir,
} from '../entities/entity.js';
import { listEntities } from './list.js';
import { getEntityIndex } from '../entities/entity-index.js';
import { getResponse } from '../responses.js';

interface TodontState {
    title: string;
    content: string;
    startDate?: string;    // YYYY-MM-DD or undefined = always
    endDate?: string;      // YYYY-MM-DD or undefined = always
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────────────────

async function saveTodont(state: TodontState): Promise<string> {
    const dir = await ensureEntityDir('todont');
    const id = generateEntityId('todont');
    const filepath = path.join(dir, `${id}.md`);

    const today = new Date().toISOString().split('T')[0];

    const lines = [
        '---',
        `id: ${id}`,
        `title: "${state.title}"`,
        `entityType: todont`,
        `created: ${today}`,
    ];
    if (state.startDate) lines.push(`startDate: ${state.startDate}`);
    if (state.endDate) lines.push(`endDate: ${state.endDate}`);
    lines.push('tags: [todont]');
    lines.push('---');
    lines.push('');
    lines.push(state.content);
    lines.push('');

    await fs.writeFile(filepath, lines.join('\n'));

    // Update entity index
    const index = getEntityIndex();
    if (index.isBuilt) {
        await index.addOrUpdate('todont', id, state.title, filepath);
    }

    return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a todont is currently active based on its date window.
 * No dates = always active. Has dates = active only within window.
 */
export function isTodontActive(
    meta: Record<string, unknown>,
    refDate: string = new Date().toISOString().split('T')[0],
): boolean {
    const start = meta.startDate as string | undefined;
    const end = meta.endDate as string | undefined;

    // No window = always active
    if (!start && !end) return true;

    // Only start date — active from that date onward
    if (start && !end) return refDate >= start;

    // Only end date — active until that date
    if (!start && end) return refDate <= end;

    // Both — active within window
    return refDate >= start! && refDate <= end!;
}

/**
 * Scan the todonts directory and return all active todonts.
 */
export async function getActiveTodonts(refDate?: string): Promise<{
    title: string;
    content: string;
    startDate?: string;
    endDate?: string;
    filepath: string;
}[]> {
    let dir: string;
    try {
        dir = await getEntityDir('todont');
    } catch {
        return [];
    }

    const active: {
        title: string;
        content: string;
        startDate?: string;
        endDate?: string;
        filepath: string;
    }[] = [];

    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (!file.endsWith('.md') || file.startsWith('.')) continue;
            const filepath = path.join(dir, file);
            const raw = await fs.readFile(filepath, 'utf-8');
            const { meta, content } = parseEntity(filepath, raw);

            if (isTodontActive(meta, refDate)) {
                active.push({
                    title: (meta.title as string) || file.replace('.md', ''),
                    content,
                    startDate: meta.startDate as string | undefined,
                    endDate: meta.endDate as string | undefined,
                    filepath,
                });
            }
        }
    } catch {
        // Dir doesn't exist yet
    }

    return active;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────────────────────────────────────

export const todontCommand = new Command('todont')
    .description('Manage things to avoid — "always" or during a time window')
    .argument('[words...]', 'Title or subcommand (list, remove)')
    .action(async (words: string[]) => {
        try {
            // Handle: dobbi todont list
            if (words[0] === 'list') {
                await listEntities('todonts');
                return;
            }

            // Handle: dobbi todont remove <title>
            if (words[0] === 'remove' || words[0] === 'delete') {
                const removeTitle = words.slice(1).join(' ');
                if (!removeTitle) {
                    console.log(chalk.yellow('\n  Please specify which todont to remove: todont remove <title>\n'));
                    return;
                }
                const found = await findEntityByTitle('todont', removeTitle);
                if (!found) {
                    console.log(chalk.red(`\n  ✗ Todont "${removeTitle}" not found\n`));
                    return;
                }
                const trashPath = await trashEntity(found.filepath);
                const idx = getEntityIndex();
                if (idx.isBuilt) {
                    const slug = path.basename(found.filepath, '.md');
                    idx.remove('todont', slug);
                }
                console.log(chalk.green(`\n  🗑  Moved to trash: ${found.meta.title}`));
                console.log(chalk.gray(`    ${trashPath}\n`));
                return;
            }

            // Create flow
            let title = words.length > 0 ? words[0] : undefined;

            if (!title) {
                const { todontTitle } = await inquirer.prompt([{
                    type: 'input',
                    name: 'todontTitle',
                    message: '🚫 What should you avoid, sir?',
                    validate: (input: string) => input.length > 0 || 'Title is required',
                }]);
                title = todontTitle;
            }

            // Ask for time window
            const { windowType } = await inquirer.prompt([{
                type: 'list',
                name: 'windowType',
                message: 'How long should this be active?',
                choices: [
                    { name: 'Always', value: 'always' },
                    { name: 'During a specific time window', value: 'window' },
                ],
            }]);

            let startDate: string | undefined;
            let endDate: string | undefined;

            if (windowType === 'window') {
                const dates = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'startDate',
                        message: 'Start date (YYYY-MM-DD):',
                        validate: (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Use YYYY-MM-DD format',
                    },
                    {
                        type: 'input',
                        name: 'endDate',
                        message: 'End date (YYYY-MM-DD):',
                        validate: (input: string) => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Use YYYY-MM-DD format',
                    },
                ]);
                startDate = dates.startDate;
                endDate = dates.endDate;
            }

            // Optional description
            const { description } = await inquirer.prompt([{
                type: 'input',
                name: 'description',
                message: 'Why? (optional):',
            }]);

            const state: TodontState = {
                title: title!,
                content: description || '',
                startDate,
                endDate,
            };

            const filepath = await saveTodont(state);
            const msg = getResponse('task_saved');
            console.log(chalk.green(`\n  🚫 ${msg}`));

            if (startDate && endDate) {
                console.log(chalk.gray(`    Active: ${startDate} → ${endDate}`));
            } else {
                console.log(chalk.gray(`    Active: always`));
            }
            console.log(chalk.gray(`    ${filepath}\n`));

        } catch (error) {
            if (error instanceof Error && error.message.includes('force closed')) return;
            console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        }
    });

export default todontCommand;
