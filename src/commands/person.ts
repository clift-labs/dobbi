import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import { getVaultRoot } from '../state/manager.js';
import { getResponse } from '../responses.js';
import {
    createEntityMeta,
    ensureEntityDir,
    writeEntity,
    findEntityByTitle,
    trashEntity,
} from '../entities/entity.js';
import { listEntities } from './list.js';
import { pushCrumb, popCrumb } from '../ui/breadcrumb.js';
import { debug } from '../utils/debug.js';
import { getEntityIndex } from '../entities/entity-index.js';
import { promises as fs } from 'fs';
import matter from 'gray-matter';

// ─────────────────────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────────────────────

interface PersonState {
    name: string;
    company: string;
    group: string;
    phone: string;
    email: string;
    handle: string;
    tags: string[];
    content: string;
    filepath?: string;
    isExisting: boolean;
}

async function savePerson(state: PersonState): Promise<string> {
    const dir = await ensureEntityDir('person');
    const meta = createEntityMeta('person', state.name, {
        tags: state.tags,
    });
    const id = state.filepath ? path.basename(state.filepath, '.md') : meta.id;
    const filepath = state.filepath ?? path.join(dir, `${id}.md`);

    const fullMeta: Record<string, unknown> = {
        ...meta,
        id,
        company: state.company || undefined,
        group: state.group || undefined,
        phone: state.phone || undefined,
        email: state.email || undefined,
        handle: state.handle || undefined,
    };

    await writeEntity(filepath, fullMeta, state.content);

    // Update entity index
    const index = getEntityIndex();
    if (index.isBuilt) {
        await index.addOrUpdate('person', id, state.name, filepath);
    }

    return filepath;
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────────────────────────────────────

async function editPerson(titleOrFilename: string): Promise<void> {
    const found = await findEntityByTitle('person', titleOrFilename);
    if (!found) {
        console.log(chalk.red(`Person not found: ${titleOrFilename}`));
        return;
    }

    const { filepath, meta, content } = found;
    const answers = await inquirer.prompt([
        { type: 'input', name: 'name', message: 'Name:', default: meta.title as string },
        { type: 'input', name: 'company', message: 'Company:', default: (meta.company as string) ?? '' },
        { type: 'input', name: 'group', message: 'Group:', default: (meta.group as string) ?? '' },
        { type: 'input', name: 'phone', message: 'Phone:', default: (meta.phone as string) ?? '' },
        { type: 'input', name: 'email', message: 'Email:', default: (meta.email as string) ?? '' },
        { type: 'input', name: 'handle', message: 'Handle (@):', default: (meta.handle as string) ?? '' },
        { type: 'input', name: 'tags', message: 'Tags (comma-separated):', default: Array.isArray(meta.tags) ? (meta.tags as string[]).join(', ') : '' },
        { type: 'editor', name: 'content', message: 'Notes about this person:', default: content },
    ]);

    const updatedMeta: Record<string, unknown> = {
        ...meta,
        title: answers.name,
        company: answers.company || undefined,
        group: answers.group || undefined,
        phone: answers.phone || undefined,
        email: answers.email || undefined,
        handle: answers.handle || undefined,
        tags: answers.tags ? answers.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    };

    await writeEntity(filepath, updatedMeta, answers.content);

    // Update entity index
    const index = getEntityIndex();
    if (index.isBuilt) {
        const slug = path.basename(filepath, '.md');
        await index.addOrUpdate('person', slug, answers.name, filepath);
    }

    console.log(chalk.green(`\n✓ Person updated: ${answers.name}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

async function deletePerson(titleOrFilename: string): Promise<void> {
    const found = await findEntityByTitle('person', titleOrFilename);
    if (!found) {
        console.log(chalk.red(`Person not found: ${titleOrFilename}`));
        return;
    }

    const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Delete "${found.meta.title}"?`,
        default: false,
    }]);

    if (confirm) {
        const trashPath = await trashEntity(found.filepath);

        // Update entity index
        const index = getEntityIndex();
        if (index.isBuilt) {
            const slug = path.basename(found.filepath, '.md');
            index.remove('person', slug);
        }

        console.log(chalk.green(`🗑  Moved to trash: ${found.meta.title}`));
        console.log(chalk.gray(`  ${trashPath}`));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────────────────────────────────────

export const personCommand = new Command('person')
    .description('Manage people / contacts')
    .argument('[action]', 'Action: create (default), list, edit, delete')
    .argument('[name...]', 'Person name or identifier')
    .action(async (action?: string, nameWords?: string[]) => {
        try {
            // Route to subcommands
            if (action === 'list') {
                await listEntities('people');
                return;
            }

            if (action === 'edit') {
                const name = nameWords?.join(' ');
                if (!name) {
                    console.log(chalk.red('Please provide a name: person edit <name>'));
                    return;
                }
                await editPerson(name);
                return;
            }

            if (action === 'delete' || action === 'remove') {
                const name = nameWords?.join(' ');
                if (!name) {
                    console.log(chalk.red('Please provide a name: person delete <name>'));
                    return;
                }
                await deletePerson(name);
                return;
            }

            // ── Create (default action) ─────────────────────────────────────
            let personName = action;
            if (nameWords && nameWords.length > 0 && action && action !== 'create') {
                personName = [action, ...nameWords].join(' ');
            } else if (action === 'create') {
                personName = nameWords?.join(' ') || undefined;
            }

            if (!personName) {
                const { inputName } = await inquirer.prompt([{
                    type: 'input',
                    name: 'inputName',
                    message: 'Person\'s name:',
                    validate: (input: string) => input.trim().length > 0 || 'Name is required',
                }]);
                personName = inputName;
            }

            // Check if person already exists
            const existing = await findEntityByTitle('person', personName!);
            if (existing) {
                console.log(chalk.yellow(`\nPerson "${existing.meta.title}" already exists. Use 'person edit ${personName}' to update.`));
                return;
            }

            // Prompt for fields
            const answers = await inquirer.prompt([
                { type: 'input', name: 'company', message: 'Company:' },
                { type: 'input', name: 'group', message: 'Group/Team:' },
                { type: 'input', name: 'phone', message: 'Phone:' },
                { type: 'input', name: 'email', message: 'Email:' },
                { type: 'input', name: 'handle', message: 'Handle (@ Slack/Teams):' },
                { type: 'input', name: 'tags', message: 'Tags (comma-separated):' },
                { type: 'input', name: 'content', message: 'Notes (optional):' },
            ]);

            const state: PersonState = {
                name: personName!,
                company: answers.company,
                group: answers.group,
                phone: answers.phone,
                email: answers.email,
                handle: answers.handle,
                tags: answers.tags ? answers.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
                content: answers.content || '',
                isExisting: false,
            };

            const filepath = await savePerson(state);
            const msg = getResponse('task_saved');
            console.log(chalk.green(`\n${msg}`));
            console.log(chalk.gray(`  👤 ${personName} → ${path.basename(filepath)}`));

        } catch (error) {
            const errMsg = getResponse('error');
            console.error(chalk.red(`\n${errMsg}`), error);
        }
    });

export default personCommand;
