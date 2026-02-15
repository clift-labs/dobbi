import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { requireProject, getVaultRoot } from '../state/manager.js';
import { getEventsContext } from '../context/reader.js';
import { getModelForCapability, createDobbieSystemPrompt } from '../llm/router.js';
import { getResponse, getPersonalizedResponse } from '../responses.js';
import { renderEntityHeader, entityPrompt, eventHeaderConfig } from '../ui/entity-prompt.js';
import { pushCrumb, popCrumb } from '../ui/breadcrumb.js';
import { debug } from '../utils/debug.js';
import { listEntities } from './list.js';

interface EventState {
    title: string;
    description: string;
    project: string;
    startTime: string;  // ISO datetime
    endTime: string;    // ISO datetime
    location?: string;
    filepath?: string;
    isExisting: boolean;
}

function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function parseDateTime(input: string): string | null {
    // Try to parse various date formats
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
        return date.toISOString();
    }
    return null;
}

async function findExistingEvent(project: string, titleOrFilename: string): Promise<EventState | null> {
    const vaultRoot = await getVaultRoot();
    const eventsDir = path.join(vaultRoot, 'projects', project, 'events');

    try {
        const files = await fs.readdir(eventsDir);

        const expectedFilename = titleOrFilename
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '.md';

        const filenameWithMd = titleOrFilename.endsWith('.md') ? titleOrFilename : titleOrFilename + '.md';

        for (const file of files) {
            if (file === expectedFilename || file === filenameWithMd || file === titleOrFilename) {
                const filepath = path.join(eventsDir, file);
                const rawContent = await fs.readFile(filepath, 'utf-8');
                const parsed = matter(rawContent);

                return {
                    title: parsed.data.title || file.replace('.md', ''),
                    description: parsed.content.trim(),
                    project,
                    startTime: parsed.data.startTime || '',
                    endTime: parsed.data.endTime || '',
                    location: parsed.data.location,
                    filepath,
                    isExisting: true,
                };
            }
        }
    } catch (err) {
        debug('event', err);
        // Events directory doesn't exist yet
    }

    return null;
}

async function clarifyEvent(state: EventState): Promise<string> {
    console.log(chalk.gray('\nDobbie is clarifying the event, sir...'));

    const context = await getEventsContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Clarify and improve the following event description. Make it clearer, add helpful context, and ensure all important details are captured. Return ONLY the improved description.

Title: ${state.title}
Start: ${formatDateTime(state.startTime)}
End: ${formatDateTime(state.endTime)}
${state.location ? `Location: ${state.location}` : ''}

Description:
${state.description || '(No description yet)'}`,
        },
    ], { systemPrompt });

    let formatted = response.trim();
    if (formatted.startsWith('```')) formatted = formatted.slice(formatted.indexOf('\n') + 1);
    if (formatted.endsWith('```')) formatted = formatted.slice(0, -3);
    return formatted.trim();
}

async function suggestTime(state: EventState): Promise<void> {
    console.log(chalk.gray('\nDobbie is analyzing timing, sir...'));

    const context = await getEventsContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Based on this event, suggest:
1. Optimal duration (how long should this take?)
2. Best time of day (morning, afternoon, evening?)
3. Any preparation time needed before?
4. Buffer time needed after?

Title: ${state.title}
Current Start: ${formatDateTime(state.startTime)}
Current End: ${formatDateTime(state.endTime)}
${state.location ? `Location: ${state.location}` : ''}

Description:
${state.description || '(No description)'}`,
        },
    ], { systemPrompt });

    console.log(chalk.cyan('\n⏰ Time Suggestions:\n'));
    console.log(response.trim());
    console.log('');
}

async function modifyEvent(state: EventState, feedback: string): Promise<string> {
    console.log(chalk.gray('\nDobbie is modifying the event, sir...'));

    const context = await getEventsContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Modify the following event description based on the user's feedback. Return ONLY the modified description.

Title: ${state.title}

Current Description:
${state.description || '(No description)'}

User Feedback: ${feedback}`,
        },
    ], { systemPrompt });

    let formatted = response.trim();
    if (formatted.startsWith('```')) formatted = formatted.slice(formatted.indexOf('\n') + 1);
    if (formatted.endsWith('```')) formatted = formatted.slice(0, -3);
    return formatted.trim();
}

async function saveEvent(state: EventState): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const eventsDir = path.join(vaultRoot, 'projects', state.project, 'events');

    await fs.mkdir(eventsDir, { recursive: true });

    let filepath = state.filepath;
    if (!filepath) {
        const filename = state.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '.md';
        filepath = path.join(eventsDir, filename);
    }

    const markdown = `---
title: "${state.title}"
startTime: ${state.startTime}
endTime: ${state.endTime}
${state.location ? `location: "${state.location}"` : ''}
project: ${state.project}
tags: [event]
---

${state.description}
`;

    await fs.writeFile(filepath, markdown);
    return filepath;
}

function displayEvent(state: EventState): void {
    console.log(chalk.cyan('\n' + '─'.repeat(50)));
    console.log(chalk.bold.cyan(`📅 ${state.title}`));
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(chalk.white(`  🕐 Start: ${formatDateTime(state.startTime)}`));
    console.log(chalk.white(`  🕐 End:   ${formatDateTime(state.endTime)}`));
    if (state.location) {
        console.log(chalk.white(`  📍 Location: ${state.location}`));
    }
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(state.description || chalk.gray('(No description yet)'));
    console.log(chalk.cyan('─'.repeat(50) + '\n'));
}

function showHelp(): void {
    console.log(chalk.gray(`
Commands:
  ${chalk.bold('clarify')}      - AI clarifies and improves the description
  ${chalk.bold('suggest-time')} - AI suggests optimal timing
  ${chalk.bold('modify')}       - AI modifies based on your feedback
  ${chalk.bold('save')}         - Save the current version
  ${chalk.bold('show')}         - Display the current event
  ${chalk.bold('edit')}         - Edit the description
  ${chalk.bold('title')}        - Change the title
  ${chalk.bold('start')}        - Set start time
  ${chalk.bold('end')}          - Set end time
  ${chalk.bold('location')}     - Set location
  ${chalk.bold('exit')}         - Save and go back
  ${chalk.bold('back')}         - Go back without saving
  ${chalk.bold('quit')}         - Quit Dobbie entirely
  ${chalk.bold('help')}         - Show this help
`));
}

async function promptDateTime(message: string, defaultValue?: string): Promise<string> {
    const { dateInput } = await inquirer.prompt([
        {
            type: 'input',
            name: 'dateInput',
            message,
            default: defaultValue,
            validate: (input: string) => {
                const parsed = parseDateTime(input);
                if (!parsed) return 'Please enter a valid date/time (e.g., "2026-02-01 14:00" or "tomorrow 2pm")';
                return true;
            },
        },
    ]);
    return parseDateTime(dateInput)!;
}

export const eventCommand = new Command('event')
    .description('Interactive event management with AI assistance')
    .argument('[words...]', 'Title and optional inline description (e.g. "dentist Need to schedule cleaning")')
    .action(async (words: string[]) => {
        try {
            // Handle: dobbie event list
            if (words[0] === 'list') {
                await listEntities('events');
                return;
            }

            const project = await requireProject();

            // Parse: first word = title, rest = inline description
            let title = words.length > 0 ? words[0] : undefined;
            const inlineBody = words.length > 1 ? words.slice(1).join(' ') : undefined;

            if (!title) {
                const { eventTitle } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'eventTitle',
                        message: 'What event shall Dobbie schedule, sir?',
                        validate: (input: string) => input.length > 0 || 'Title is required',
                    },
                ]);
                title = eventTitle;
            }

            const existing = await findExistingEvent(project, title!);

            let state: EventState;

            if (existing) {
                // Open existing event — if inline body, append to description
                if (inlineBody) {
                    const updatedDescription = existing.description
                        ? existing.description + '\n\n' + inlineBody
                        : inlineBody;
                    state = {
                        ...existing,
                        description: updatedDescription,
                    };
                    const filepath = await saveEvent(state);
                    console.log(chalk.green(`\n✓ Appended to "${existing.title}" → ${filepath}`));
                    return;
                }

                console.log(chalk.green(`\n✓ Opening existing event "${existing.title}"`));
                state = existing;
            } else if (inlineBody) {
                // Quick event — save immediately, dates can be set later
                state = {
                    title: title!,
                    description: inlineBody,
                    project,
                    startTime: '',
                    endTime: '',
                    location: undefined,
                    isExisting: false,
                };
                const filepath = await saveEvent(state);
                console.log(chalk.green(`\n✓ Quick event saved → ${filepath}`));
                return;
            } else {
                // Create new event with full prompts
                console.log(chalk.gray('\nLet\'s set up the event details, sir.'));

                const startTime = await promptDateTime('Start time (e.g., "2026-02-01 14:00"):');
                const endTime = await promptDateTime('End time:', new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString());

                const { location } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'location',
                        message: 'Location (optional):',
                    },
                ]);

                const { description } = await inquirer.prompt([
                    {
                        type: 'editor',
                        name: 'description',
                        message: 'Event description (optional):',
                    },
                ]);

                state = {
                    title: title!,
                    description: description.trim(),
                    project,
                    startTime,
                    endTime,
                    location: location || undefined,
                    isExisting: false,
                };

                console.log(chalk.green(`\n✓ Event created for project "${project}"`));
            }

            pushCrumb('event');
            renderEntityHeader(eventHeaderConfig(state));
            showHelp();
            displayEvent(state);

            let running = true;
            while (running) {
                const { command } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'command',
                        message: entityPrompt('event'),
                        prefix: '',
                    },
                ]);

                const cmd = command.trim().toLowerCase();
                const parts = cmd.split(' ');
                const action = parts[0];
                const args = parts.slice(1).join(' ');

                switch (action) {
                    case 'save': {
                        const filepath = await saveEvent(state);
                        console.log(chalk.green(`\n✓ Event saved to ${filepath}, sir!`));
                        break;
                    }

                    case 'exit': {
                        const filepath = await saveEvent(state);
                        console.log(chalk.green(`\n✓ Event saved to ${filepath}, sir!`));
                        running = false;
                        break;
                    }

                    case 'back':
                    case 'b': {
                        const { confirm } = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'confirm',
                                message: 'Dobbie notices unsaved work, sir. Discard changes?',
                                default: false,
                            },
                        ]);
                        if (confirm) {
                            console.log(chalk.yellow(getResponse('task_discarded')));
                            running = false;
                        }
                        break;
                    }

                    case 'quit':
                    case 'q': {
                        const { confirm: quitConfirm } = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'confirm',
                                message: 'Dobbie notices unsaved work, sir. Quit Dobbie entirely?',
                                default: false,
                            },
                        ]);
                        if (quitConfirm) {
                            console.log(chalk.yellow(await getPersonalizedResponse('farewell')));
                            process.exit(42);
                        }
                        break;
                    }

                    case 'clarify': {
                        try {
                            state.description = await clarifyEvent(state);
                            console.log(chalk.green('✓ Event clarified!'));
                            displayEvent(state);
                        } catch (error) {
                            console.error(chalk.red('Error clarifying event:'), error);
                        }
                        break;
                    }

                    case 'suggest-time': {
                        try {
                            await suggestTime(state);
                        } catch (error) {
                            console.error(chalk.red('Error suggesting time:'), error);
                        }
                        break;
                    }

                    case 'modify': {
                        if (!args) {
                            const { feedback } = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'feedback',
                                    message: 'How should Dobbie modify the event?',
                                },
                            ]);
                            if (feedback) {
                                try {
                                    state.description = await modifyEvent(state, feedback);
                                    console.log(chalk.green('✓ Event modified!'));
                                    displayEvent(state);
                                } catch (error) {
                                    console.error(chalk.red('Error modifying event:'), error);
                                }
                            }
                        } else {
                            try {
                                state.description = await modifyEvent(state, args);
                                console.log(chalk.green('✓ Event modified!'));
                                displayEvent(state);
                            } catch (error) {
                                console.error(chalk.red('Error modifying event:'), error);
                            }
                        }
                        break;
                    }

                    case 'show': {
                        displayEvent(state);
                        break;
                    }

                    case 'edit': {
                        const { newDesc } = await inquirer.prompt([
                            {
                                type: 'editor',
                                name: 'newDesc',
                                message: 'Edit description:',
                                default: state.description,
                            },
                        ]);
                        state.description = newDesc.trim();
                        console.log(chalk.green('✓ Description updated!'));
                        displayEvent(state);
                        break;
                    }

                    case 'title': {
                        const { newTitle } = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'newTitle',
                                message: 'New title:',
                                default: state.title,
                            },
                        ]);
                        state.title = newTitle;
                        console.log(chalk.green(`✓ Title changed to "${newTitle}"`));
                        break;
                    }

                    case 'start': {
                        state.startTime = await promptDateTime('New start time:', state.startTime);
                        console.log(chalk.green(`✓ Start time updated`));
                        displayEvent(state);
                        break;
                    }

                    case 'end': {
                        state.endTime = await promptDateTime('New end time:', state.endTime);
                        console.log(chalk.green(`✓ End time updated`));
                        displayEvent(state);
                        break;
                    }

                    case 'location': {
                        const { newLocation } = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'newLocation',
                                message: 'Location:',
                                default: state.location || '',
                            },
                        ]);
                        state.location = newLocation || undefined;
                        console.log(chalk.green(newLocation ? `✓ Location set to "${newLocation}"` : '✓ Location cleared'));
                        displayEvent(state);
                        break;
                    }

                    case 'help':
                    case '?': {
                        showHelp();
                        break;
                    }

                    case '': {
                        break;
                    }

                    default: {
                        console.log(chalk.yellow(`Unknown command: ${action}. Type 'help' for options.`));
                        break;
                    }
                }
            }
            popCrumb();

        } catch (error) {
            console.error(chalk.red('Dobbie encountered an error, sir:'), error);
        }
    });

export default eventCommand;
