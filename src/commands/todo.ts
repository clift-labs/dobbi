import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { requireProject, getVaultRoot } from '../state/manager.js';
import { getTodosContext } from '../context/reader.js';
import { getModelForCapability, createDobbieSystemPrompt } from '../llm/router.js';
import { getResponse, getPersonalizedResponse } from '../responses.js';
import { renderEntityHeader, entityPrompt, todoHeaderConfig } from '../ui/entity-prompt.js';
import { pushCrumb, popCrumb } from '../ui/breadcrumb.js';
import { debug } from '../utils/debug.js';
import { listEntities } from './list.js';

interface TodoState {
    title: string;
    content: string;
    project: string;
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;
    filepath?: string;
    isExisting: boolean;
    completed: boolean;
}

async function findExistingTodo(project: string, titleOrFilename: string): Promise<{ filepath: string; title: string; content: string; priority: string; dueDate?: string; completed: boolean } | null> {
    const vaultRoot = await getVaultRoot();
    const todosDir = path.join(vaultRoot, 'projects', project, 'todos');

    try {
        const files = await fs.readdir(todosDir);

        // Convert title to expected filename
        const expectedFilename = titleOrFilename
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '.md';

        // Also check without .md extension
        const filenameWithMd = titleOrFilename.endsWith('.md') ? titleOrFilename : titleOrFilename + '.md';

        for (const file of files) {
            if (file === expectedFilename || file === filenameWithMd || file === titleOrFilename) {
                const filepath = path.join(todosDir, file);
                const rawContent = await fs.readFile(filepath, 'utf-8');
                const parsed = matter(rawContent);

                return {
                    filepath,
                    title: parsed.data.title || file.replace('.md', ''),
                    content: parsed.content.trim(),
                    priority: parsed.data.priority || 'medium',
                    dueDate: parsed.data.dueDate,
                    completed: parsed.data.completed || false,
                };
            }
        }
    } catch (err) {
        debug('todo', err);
        // Todos directory doesn't exist yet
    }

    return null;
}

async function breakdownTodo(state: TodoState): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('todo_breakdown')));

    const context = await getTodosContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Break down the following todo into smaller, actionable subtasks. Format as a markdown checklist with [ ] for each item. Keep each subtask specific and achievable.

Title: ${state.title}

Current Content:
${state.content || '(No details yet)'}`,
        },
    ], { systemPrompt });

    // Strip code fences if present
    let formatted = response.trim();
    if (formatted.startsWith('```markdown')) {
        formatted = formatted.slice(11);
    } else if (formatted.startsWith('```')) {
        formatted = formatted.slice(3);
    }
    if (formatted.endsWith('```')) {
        formatted = formatted.slice(0, -3);
    }

    return formatted.trim();
}

async function clarifyTodo(state: TodoState): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('processing')));

    const context = await getTodosContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Review and clarify the following todo. Make the description clearer, add context if helpful, and ensure the goal is specific and measurable. Return ONLY the improved content, no explanations.

Title: ${state.title}
Priority: ${state.priority}
${state.dueDate ? `Due: ${state.dueDate}` : ''}

Content:
${state.content || '(No details yet)'}`,
        },
    ], { systemPrompt });

    // Strip code fences if present
    let formatted = response.trim();
    if (formatted.startsWith('```markdown')) {
        formatted = formatted.slice(11);
    } else if (formatted.startsWith('```')) {
        formatted = formatted.slice(3);
    }
    if (formatted.endsWith('```')) {
        formatted = formatted.slice(0, -3);
    }

    return formatted.trim();
}

async function estimateTodo(state: TodoState): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('thinking')));

    const context = await getTodosContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Analyze the following todo and provide:
1. Time estimate (how long it will take)
2. Complexity rating (simple/moderate/complex)
3. Dependencies (what needs to be done first)
4. Suggested priority based on the content

Keep the analysis brief and actionable.

Title: ${state.title}
Current Priority: ${state.priority}
${state.dueDate ? `Due: ${state.dueDate}` : ''}

Content:
${state.content || '(No details yet)'}`,
        },
    ], { systemPrompt });

    return response.trim();
}

async function modifyTodo(state: TodoState, feedback: string): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('processing')));

    const context = await getTodosContext(state.project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Modify the following todo based on the user's feedback. Return ONLY the modified content, no explanations.

Title: ${state.title}

Current Content:
${state.content || '(No details yet)'}

User Feedback: ${feedback}`,
        },
    ], { systemPrompt });

    // Strip code fences if present
    let formatted = response.trim();
    if (formatted.startsWith('```markdown')) {
        formatted = formatted.slice(11);
    } else if (formatted.startsWith('```')) {
        formatted = formatted.slice(3);
    }
    if (formatted.endsWith('```')) {
        formatted = formatted.slice(0, -3);
    }

    return formatted.trim();
}

async function formatTodo(state: TodoState): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('processing')));

    try {
        const context = await getTodosContext(state.project);
        const llm = await getModelForCapability('format');
        const systemPrompt = createDobbieSystemPrompt(context);

        const response = await llm.chat([
            {
                role: 'user',
                content: `Format the following todo content as clean, well-structured markdown. Use appropriate headers, lists, and emphasis. Keep all information intact.

IMPORTANT: Return ONLY the raw markdown content. Do NOT wrap in code fences.

Title: ${state.title}

Content:
${state.content}`,
            },
        ], { systemPrompt });

        // Strip code fences if present
        let formatted = response.trim();
        if (formatted.startsWith('```markdown')) {
            formatted = formatted.slice(11);
        } else if (formatted.startsWith('```md')) {
            formatted = formatted.slice(5);
        } else if (formatted.startsWith('```')) {
            formatted = formatted.slice(3);
        }
        if (formatted.endsWith('```')) {
            formatted = formatted.slice(0, -3);
        }

        return formatted.trim();
    } catch (err) {
        debug('todo', err);
        console.log(chalk.yellow('Formatting skipped (configure AI for formatting)'));
        return state.content;
    }
}

async function saveTodo(state: TodoState): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const todosDir = path.join(vaultRoot, 'projects', state.project, 'todos');

    // Ensure todos directory exists
    await fs.mkdir(todosDir, { recursive: true });

    // Use existing filepath or create new one
    let filepath = state.filepath;
    if (!filepath) {
        const filename = state.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') + '.md';
        filepath = path.join(todosDir, filename);
    }

    // Format content before saving
    const finalContent = await formatTodo(state);

    // Create markdown with frontmatter
    const today = new Date().toISOString().split('T')[0];
    const markdown = `---
title: "${state.title}"
created: ${today}
project: ${state.project}
priority: ${state.priority}
${state.dueDate ? `dueDate: ${state.dueDate}` : ''}
completed: ${state.completed}
tags: [todo]
---

${finalContent}
`;

    await fs.writeFile(filepath, markdown);
    return filepath;
}

function displayTodo(state: TodoState): void {
    const priorityColors = {
        low: chalk.gray,
        medium: chalk.yellow,
        high: chalk.red,
    };
    const priorityColor = priorityColors[state.priority];
    const statusIcon = state.completed ? '✅' : '⬜';

    console.log(chalk.cyan('\n' + '─'.repeat(50)));
    console.log(`${statusIcon} ${chalk.bold.cyan(state.title)} ${priorityColor(`[${state.priority}]`)}`);
    if (state.dueDate) {
        console.log(chalk.gray(`   Due: ${state.dueDate}`));
    }
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(state.content || chalk.gray('(No details yet)'));
    console.log(chalk.cyan('─'.repeat(50) + '\n'));
}

function showHelp(): void {
    console.log(chalk.gray(`
Commands:
  ${chalk.bold('breakdown')}  - AI breaks the todo into subtasks
  ${chalk.bold('clarify')}    - AI clarifies and improves the description
  ${chalk.bold('estimate')}   - AI estimates time, complexity, dependencies
  ${chalk.bold('modify')}     - AI modifies the todo based on your feedback
  ${chalk.bold('save')}       - Save the current version
  ${chalk.bold('show')}       - Display the current todo
  ${chalk.bold('edit')}       - Edit the todo content
  ${chalk.bold('title')}      - Change the title
  ${chalk.bold('priority')}   - Set priority (low|medium|high)
  ${chalk.bold('due')}        - Set due date
  ${chalk.bold('done')}       - Mark as completed
  ${chalk.bold('exit')}       - Save and go back
  ${chalk.bold('back')}       - Go back without saving
  ${chalk.bold('quit')}       - Quit Dobbie entirely
  ${chalk.bold('help')}       - Show this help
`));
}

export const todoCommand = new Command('todo')
    .alias('task')
    .description('Interactive todo management with AI assistance')
    .argument('[words...]', 'Title and optional inline description (e.g. "fix-login The login 500s with plus signs")')
    .action(async (words: string[]) => {
        try {
            // Handle: dobbie todo list
            if (words[0] === 'list') {
                await listEntities('todos');
                return;
            }

            // Require a project
            const project = await requireProject();

            // Parse: first word = title, rest = inline description
            let title = words.length > 0 ? words[0] : undefined;
            const inlineBody = words.length > 1 ? words.slice(1).join(' ') : undefined;

            // Get title if not provided
            if (!title) {
                const { todoTitle } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'todoTitle',
                        message: 'What task shall Dobbie track, sir?',
                        validate: (input: string) => input.length > 0 || 'Title is required',
                    },
                ]);
                title = todoTitle;
            }

            // Check if todo already exists
            const existing = await findExistingTodo(project, title!);

            let state: TodoState;

            if (existing) {
                // Open existing todo — if inline body, append to it
                if (inlineBody) {
                    const updatedContent = existing.content
                        ? existing.content + '\n\n' + inlineBody
                        : inlineBody;
                    state = {
                        title: existing.title,
                        content: updatedContent,
                        project,
                        priority: existing.priority as 'low' | 'medium' | 'high',
                        dueDate: existing.dueDate,
                        filepath: existing.filepath,
                        isExisting: true,
                        completed: existing.completed,
                    };
                    const filepath = await saveTodo(state);
                    console.log(chalk.green(`\n✓ Appended to "${existing.title}" → ${filepath}`));
                    return;
                }

                console.log(chalk.green(`\n✓ Opening existing todo "${existing.title}"`));
                state = {
                    title: existing.title,
                    content: existing.content,
                    project,
                    priority: existing.priority as 'low' | 'medium' | 'high',
                    dueDate: existing.dueDate,
                    filepath: existing.filepath,
                    isExisting: true,
                    completed: existing.completed,
                };
            } else if (inlineBody) {
                // Quick todo — save immediately with medium priority
                state = {
                    title: title!,
                    content: inlineBody,
                    project,
                    priority: 'medium',
                    dueDate: undefined,
                    isExisting: false,
                    completed: false,
                };
                const filepath = await saveTodo(state);
                console.log(chalk.green(`\n✓ Quick todo saved → ${filepath}`));
                return;
            } else {
                // Create new todo - get initial details
                const { priority } = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'priority',
                        message: 'Priority level?',
                        choices: [
                            { name: 'Low', value: 'low' },
                            { name: 'Medium', value: 'medium' },
                            { name: 'High', value: 'high' },
                        ],
                        default: 'medium',
                    },
                ]);

                const { dueDate } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'dueDate',
                        message: 'Due date (YYYY-MM-DD, or leave empty):',
                        validate: (input: string) => {
                            if (!input) return true;
                            return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Use format YYYY-MM-DD';
                        },
                    },
                ]);

                const { content } = await inquirer.prompt([
                    {
                        type: 'editor',
                        name: 'content',
                        message: 'Todo details (optional):',
                    },
                ]);

                state = {
                    title: title!,
                    content: content.trim(),
                    project,
                    priority,
                    dueDate: dueDate || undefined,
                    isExisting: false,
                    completed: false,
                };

                console.log(chalk.green(`\n✓ Todo created for project "${project}"`));
            }

            pushCrumb('todo');
            renderEntityHeader(todoHeaderConfig(state));
            showHelp();
            displayTodo(state);

            // Interactive loop
            let running = true;
            while (running) {
                const { command } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'command',
                        message: entityPrompt('todo'),
                        prefix: '',
                    },
                ]);

                const cmd = command.trim().toLowerCase();
                const parts = cmd.split(' ');
                const action = parts[0];
                const args = parts.slice(1).join(' ');

                switch (action) {
                    case 'save': {
                        const filepath = await saveTodo(state);
                        console.log(chalk.green(`\n✓ Todo saved to ${filepath}, sir!`));
                        break;
                    }

                    case 'exit': {
                        const filepath = await saveTodo(state);
                        console.log(chalk.green(`\n✓ Todo saved to ${filepath}, sir!`));
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

                    case 'breakdown': {
                        try {
                            const breakdown = await breakdownTodo(state);
                            state.content = state.content ? state.content + '\n\n## Subtasks\n\n' + breakdown : breakdown;
                            console.log(chalk.green('✓ Todo broken down into subtasks!'));
                            displayTodo(state);
                        } catch (error) {
                            console.error(chalk.red('Error breaking down todo:'), error);
                        }
                        break;
                    }

                    case 'clarify': {
                        try {
                            state.content = await clarifyTodo(state);
                            console.log(chalk.green('✓ Todo clarified!'));
                            displayTodo(state);
                        } catch (error) {
                            console.error(chalk.red('Error clarifying todo:'), error);
                        }
                        break;
                    }

                    case 'estimate': {
                        try {
                            const estimate = await estimateTodo(state);
                            console.log(chalk.cyan('\n📊 Estimate:\n'));
                            console.log(estimate);
                            console.log('');
                        } catch (error) {
                            console.error(chalk.red('Error estimating todo:'), error);
                        }
                        break;
                    }

                    case 'modify': {
                        if (!args) {
                            const { feedback } = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'feedback',
                                    message: 'How should Dobbie modify the todo?',
                                },
                            ]);
                            if (feedback) {
                                try {
                                    state.content = await modifyTodo(state, feedback);
                                    console.log(chalk.green('✓ Todo modified!'));
                                    displayTodo(state);
                                } catch (error) {
                                    console.error(chalk.red('Error modifying todo:'), error);
                                }
                            }
                        } else {
                            try {
                                state.content = await modifyTodo(state, args);
                                console.log(chalk.green('✓ Todo modified!'));
                                displayTodo(state);
                            } catch (error) {
                                console.error(chalk.red('Error modifying todo:'), error);
                            }
                        }
                        break;
                    }

                    case 'show': {
                        displayTodo(state);
                        break;
                    }

                    case 'edit': {
                        const { newContent } = await inquirer.prompt([
                            {
                                type: 'editor',
                                name: 'newContent',
                                message: 'Edit todo:',
                                default: state.content,
                            },
                        ]);
                        state.content = newContent.trim();
                        console.log(chalk.green('✓ Todo updated!'));
                        displayTodo(state);
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

                    case 'priority': {
                        const newPriority = args as 'low' | 'medium' | 'high';
                        if (['low', 'medium', 'high'].includes(newPriority)) {
                            state.priority = newPriority;
                            console.log(chalk.green(`✓ Priority set to ${newPriority}`));
                        } else {
                            const { selectedPriority } = await inquirer.prompt([
                                {
                                    type: 'list',
                                    name: 'selectedPriority',
                                    message: 'Select priority:',
                                    choices: ['low', 'medium', 'high'],
                                    default: state.priority,
                                },
                            ]);
                            state.priority = selectedPriority;
                            console.log(chalk.green(`✓ Priority set to ${selectedPriority}`));
                        }
                        displayTodo(state);
                        break;
                    }

                    case 'due': {
                        if (args && /^\d{4}-\d{2}-\d{2}$/.test(args)) {
                            state.dueDate = args;
                            console.log(chalk.green(`✓ Due date set to ${args}`));
                        } else {
                            const { newDueDate } = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'newDueDate',
                                    message: 'Due date (YYYY-MM-DD):',
                                    default: state.dueDate || '',
                                    validate: (input: string) => {
                                        if (!input) return true;
                                        return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Use format YYYY-MM-DD';
                                    },
                                },
                            ]);
                            state.dueDate = newDueDate || undefined;
                            console.log(chalk.green(newDueDate ? `✓ Due date set to ${newDueDate}` : '✓ Due date cleared'));
                        }
                        displayTodo(state);
                        break;
                    }

                    case 'done': {
                        state.completed = !state.completed;
                        console.log(chalk.green(state.completed ? '✓ Marked as completed!' : '✓ Marked as incomplete'));
                        displayTodo(state);
                        break;
                    }

                    case 'help':
                    case '?': {
                        showHelp();
                        break;
                    }

                    case '': {
                        // Empty command, ignore
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
            console.error(chalk.red(getResponse('error')), error);
        }
    });

export default todoCommand;
