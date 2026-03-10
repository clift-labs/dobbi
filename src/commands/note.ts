import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getVaultRoot } from '../state/manager.js';
import { getEnrichedContext } from '../context/reader.js';
import { getModelForCapability, createDobbiSystemPrompt } from '../llm/router.js';
import { getResponse } from '../responses.js';
import { renderEntityHeader, entityPrompt, noteHeaderConfig } from '../ui/entity-prompt.js';
import { pushCrumb, popCrumb } from '../ui/breadcrumb.js';
import { debug } from '../utils/debug.js';
import { listEntities } from './list.js';
import { getEntityIndex } from '../entities/entity-index.js';
import { findEntityByTitle, trashEntity, generateEntityId } from '../entities/entity.js';

interface NoteState {
    title: string;
    content: string;
    filepath?: string;  // If editing existing note
    isExisting: boolean;
}

async function findExistingNote(titleOrFilename: string): Promise<{ filepath: string; title: string; content: string } | null> {
    const found = await findEntityByTitle('note', titleOrFilename);
    if (!found) return null;
    return {
        filepath: found.filepath,
        title: found.meta.title as string,
        content: found.content,
    };
}

async function reviewNote(state: NoteState): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('note_reviewing')));

    const context = await getEnrichedContext('notes', state.content);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbiSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Review and improve the following note. Fix any grammar, spelling, or clarity issues. Keep the same meaning but make it clearer and more professional. Return ONLY the improved content, no explanations, no title heading.

${state.content}`,
        },
    ], { systemPrompt });

    return response.trim();
}

async function generateQuestions(state: NoteState): Promise<string[]> {
    console.log(chalk.gray('\n' + getResponse('thinking')));

    const context = await getEnrichedContext('notes', state.content);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbiSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Based on this note, generate exactly 3 thoughtful questions that would help expand or clarify the ideas. Format as a numbered list (1. 2. 3.).

Title: ${state.title}

Content:
${state.content}`,
        },
    ], { systemPrompt });

    // Parse questions from response
    const lines = response.split('\n').filter(line => /^\d+\./.test(line.trim()));
    return lines.slice(0, 3);
}

async function modifyNote(state: NoteState, feedback: string): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('processing')));

    const context = await getEnrichedContext('notes', state.content);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbiSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Modify the following note based on the user's feedback. Return ONLY the modified note content, no explanations.

Title: ${state.title}

Current Content:
${state.content}

User Feedback: ${feedback}`,
        },
    ], { systemPrompt });

    return response.trim();
}

async function formatAsMarkdown(state: NoteState): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('note_formatted')));

    try {
        const context = await getEnrichedContext('notes', state.content);
        const llm = await getModelForCapability('format');
        const systemPrompt = createDobbiSystemPrompt(context);

        const response = await llm.chat([
            {
                role: 'user',
                content: `Convert the following note content to clean, well-formatted markdown. Use appropriate headers, lists, emphasis, and structure. Keep all the original information intact.

IMPORTANT: Return ONLY the raw markdown content. Do NOT wrap the output in code fences like \`\`\`markdown or \`\`\`. Just return the plain markdown text.

Title: ${state.title}

Content:
${state.content}`,
            },
        ], { systemPrompt });

        // Strip any markdown code fences that might have been included
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
        debug('note', err);
        // If formatting fails, return original content
        console.log(chalk.yellow('Note: Markdown formatting skipped (configure AI for formatting)'));
        return state.content;
    }
}

async function saveNote(state: NoteState, formatContent: boolean = true): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const notesDir = path.join(vaultRoot, 'notes');

    // Ensure notes directory exists
    await fs.mkdir(notesDir, { recursive: true });

    // Use existing filepath or create new one
    let filepath = state.filepath;
    const entityId = filepath ? path.basename(filepath, '.md') : generateEntityId('note');
    if (!filepath) {
        filepath = path.join(notesDir, `${entityId}.md`);
    }

    // Format content as markdown if requested
    let finalContent = state.content;
    if (formatContent) {
        finalContent = await formatAsMarkdown(state);
    }

    // Create markdown with frontmatter
    const today = new Date().toISOString().split('T')[0];
    const markdown = `---
id: ${entityId}
title: "${state.title}"
created: ${today}
tags: [note]
---

${finalContent}
`;

    await fs.writeFile(filepath, markdown);

    // Update entity index
    const index = getEntityIndex();
    if (index.isBuilt) {
        const slug = path.basename(filepath, '.md');
        await index.addOrUpdate('note', slug, state.title, filepath);
    }

    return filepath;
}

function displayNote(state: NoteState): void {
    console.log(chalk.cyan('\n' + '─'.repeat(50)));
    console.log(chalk.bold.cyan(`📝 ${state.title}`));
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(state.content);
    console.log(chalk.cyan('─'.repeat(50) + '\n'));
}

type DiagramType = 'flowchart' | 'class' | 'sequence';

async function generateDiagram(state: NoteState, diagramType: DiagramType): Promise<string> {
    console.log(chalk.gray('\n' + getResponse('diagram_generating')));

    const context = await getEnrichedContext('notes', state.content);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbiSystemPrompt(context);

    const diagramInstructions: Record<DiagramType, string> = {
        flowchart: `Create a mermaid flowchart diagram that visualizes the process or flow described in the note. Use:
- flowchart TD (top-down) or flowchart LR (left-right)
- Rectangle nodes for steps: A[Step Name]
- Diamond nodes for decisions: B{Decision?}
- Arrows with labels: A -->|label| B`,
        class: `Create a mermaid class diagram that represents the entities, objects, or components described in the note. Use:
- class ClassName
- Properties and methods
- Relationships: inheritance (--|>), composition (*--), aggregation (o--)`,
        sequence: `Create a mermaid sequence diagram that shows the interactions or flow of events described in the note. Use:
- participant names
- arrows for messages: A->>B: message
- notes: Note right of A: text
- loops and alternatives if needed`,
    };

    const response = await llm.chat([
        {
            role: 'user',
            content: `Based on the following note, generate a mermaid ${diagramType} diagram.

${diagramInstructions[diagramType]}

IMPORTANT: Return ONLY the mermaid diagram code block. Start with \`\`\`mermaid and end with \`\`\`. Do not include any explanation.

Title: ${state.title}

Content:
${state.content}`,
        },
    ], { systemPrompt });

    // Extract the mermaid block
    let diagram = response.trim();

    // Ensure it starts with mermaid code block
    if (!diagram.startsWith('```mermaid')) {
        if (diagram.startsWith('```')) {
            diagram = '```mermaid' + diagram.slice(3);
        } else {
            diagram = '```mermaid\n' + diagram + '\n```';
        }
    }

    return diagram;
}

function showHelp(): void {
    console.log(chalk.gray(`
Commands:
  ${chalk.bold('review')}     - AI reviews and improves the note
  ${chalk.bold('questions')}  - AI generates 3 questions about the note
  ${chalk.bold('modify')}     - AI modifies the note based on your feedback
  ${chalk.bold('diagram')}    - AI generates a mermaid diagram (flowchart|class|sequence)
  ${chalk.bold('save')}       - Save the current version
  ${chalk.bold('show')}       - Display the current note
  ${chalk.bold('edit')}       - Edit the note content
  ${chalk.bold('title')}      - Change the title
  ${chalk.bold('exit')}       - Save and go back
  ${chalk.bold('back')}       - Save and go back
  ${chalk.bold('abort')}      - Discard changes and go back
  ${chalk.bold('quit')}       - Quit Dobbi entirely
  ${chalk.bold('help')}       - Show this help
`));
}

export const noteCommand = new Command('note')
    .description('Take an interactive note with AI assistance')
    .argument('[words...]', 'Title and optional inline body (e.g. "my-idea Use the Ferral CCI system")')
    .action(async (words: string[]) => {
        try {
            // Handle: dobbi note list
            if (words[0] === 'list') {
                await listEntities('notes');
                return;
            }

            // Handle: dobbi note remove <title>
            if (words[0] === 'remove' || words[0] === 'delete') {
                const removeTitle = words.slice(1).join(' ');
                if (!removeTitle) {
                    console.log(chalk.yellow('\n  Please specify which note to remove: note remove <title>\n'));
                    return;
                }
                const found = await findEntityByTitle('note', removeTitle);
                if (!found) {
                    console.log(chalk.red(`\n  ✗ Note "${removeTitle}" not found\n`));
                    return;
                }
                const trashPath = await trashEntity(found.filepath);
                const idx = getEntityIndex();
                if (idx.isBuilt) {
                    const slug = path.basename(found.filepath, '.md');
                    idx.remove('note', slug);
                }
                console.log(chalk.green(`\n  🗑  Moved to trash: ${found.meta.title}`));
                console.log(chalk.gray(`    ${trashPath}\n`));
                return;
            }

            // Parse: first word = title, rest = inline body
            let title = words.length > 0 ? words[0] : undefined;
            const inlineBody = words.length > 1 ? words.slice(1).join(' ') : undefined;

            // Get title if not provided
            if (!title) {
                const { noteTitle } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'noteTitle',
                        message: 'What shall Dobbi call this note, sir?',
                        validate: (input: string) => input.length > 0 || 'Title is required',
                    },
                ]);
                title = noteTitle;
            }

            // Check if note already exists
            const existing = await findExistingNote(title!);

            let state: NoteState;

            if (existing) {
                // Open existing note — if inline body, append to it
                if (inlineBody) {
                    const updatedContent = existing.content
                        ? existing.content + '\n\n' + inlineBody
                        : inlineBody;
                    state = {
                        title: existing.title,
                        content: updatedContent,
                        filepath: existing.filepath,
                        isExisting: true,
                    };
                    const filepath = await saveNote(state);
                    console.log(chalk.green(`\n✓ Appended to "${existing.title}" → ${filepath}`));
                    return;
                }

                console.log(chalk.green(`\n✓ Opening existing note "${existing.title}"`));
                state = {
                    title: existing.title,
                    content: existing.content,
                    filepath: existing.filepath,
                    isExisting: true,
                };
            } else if (inlineBody) {
                // Quick note — save immediately, no interactive loop
                state = {
                    title: title!,
                    content: inlineBody,
                    isExisting: false,
                };
                const filepath = await saveNote(state);
                console.log(chalk.green(`\n✓ Quick note saved → ${filepath}`));
                return;
            } else {
                // Create new note - get initial content
                console.log(chalk.gray('\nEnter your note content (end with an empty line):'));
                const { content } = await inquirer.prompt([
                    {
                        type: 'editor',
                        name: 'content',
                        message: 'Note content:',
                    },
                ]);

                state = {
                    title: title!,
                    content: content.trim(),
                    isExisting: false,
                };

                console.log(chalk.green(`\n✓ Note started`));
            }

            pushCrumb('note');
            renderEntityHeader(noteHeaderConfig(state));
            showHelp();
            displayNote(state);

            // Interactive loop
            let running = true;
            while (running) {
                const { command } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'command',
                        message: entityPrompt('note'),
                        prefix: '',
                    },
                ]);

                const cmd = command.trim().toLowerCase();
                const parts = cmd.split(' ');
                const action = parts[0];
                const args = parts.slice(1).join(' ');

                switch (action) {
                    case 'save': {
                        const filepath = await saveNote(state);
                        console.log(chalk.green(`\n✓ Note saved to ${filepath}, sir!`));
                        break;
                    }

                    case 'exit': {
                        const filepath = await saveNote(state);
                        console.log(chalk.green(`\n✓ Note saved to ${filepath}, sir!`));
                        running = false;
                        break;
                    }

                    case 'back':
                    case 'b': {
                        const filepath = await saveNote(state);
                        console.log(chalk.green(`\n✓ Note saved to ${filepath}, sir!`));
                        running = false;
                        break;
                    }

                    case 'abort': {
                        const { confirm } = await inquirer.prompt([
                            {
                                type: 'confirm',
                                name: 'confirm',
                                message: 'Dobbi notices unsaved work, sir. Discard changes?',
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
                                message: 'Dobbi notices unsaved work, sir. Quit Dobbi entirely?',
                                default: false,
                            },
                        ]);
                        if (quitConfirm) {
                            console.log(chalk.yellow(getResponse('farewell')));
                            process.exit(42);
                        }
                        break;
                    }

                    case 'review': {
                        try {
                            state.content = await reviewNote(state);
                            console.log(chalk.green('✓ Note reviewed and improved!'));
                            displayNote(state);
                        } catch (error) {
                            console.error(chalk.red('Error reviewing note:'), error);
                        }
                        break;
                    }

                    case 'questions': {
                        try {
                            const questions = await generateQuestions(state);
                            console.log(chalk.cyan('\n🤔 Questions to consider:\n'));
                            for (const q of questions) {
                                console.log(chalk.white(`  ${q}`));
                            }
                            console.log('');
                        } catch (error) {
                            console.error(chalk.red('Error generating questions:'), error);
                        }
                        break;
                    }

                    case 'diagram': {
                        const validTypes: DiagramType[] = ['flowchart', 'class', 'sequence'];
                        let diagramType = args as DiagramType;

                        if (!diagramType || !validTypes.includes(diagramType)) {
                            const { selectedType } = await inquirer.prompt([
                                {
                                    type: 'list',
                                    name: 'selectedType',
                                    message: 'What type of diagram shall Dobbi create?',
                                    choices: [
                                        { name: 'Flowchart - Process or workflow visualization', value: 'flowchart' },
                                        { name: 'Class - Entities and relationships', value: 'class' },
                                        { name: 'Sequence - Interactions over time', value: 'sequence' },
                                    ],
                                },
                            ]);
                            diagramType = selectedType;
                        }

                        try {
                            const diagram = await generateDiagram(state, diagramType);
                            state.content = state.content + '\n\n' + diagram;
                            console.log(chalk.green(`✓ ${diagramType} diagram added to note!`));
                            displayNote(state);
                        } catch (error) {
                            console.error(chalk.red('Error generating diagram:'), error);
                        }
                        break;
                    }

                    case 'modify': {
                        if (!args) {
                            const { feedback } = await inquirer.prompt([
                                {
                                    type: 'input',
                                    name: 'feedback',
                                    message: 'How should Dobbi modify the note?',
                                },
                            ]);
                            if (feedback) {
                                try {
                                    state.content = await modifyNote(state, feedback);
                                    console.log(chalk.green('✓ Note modified!'));
                                    displayNote(state);
                                } catch (error) {
                                    console.error(chalk.red('Error modifying note:'), error);
                                }
                            }
                        } else {
                            try {
                                state.content = await modifyNote(state, args);
                                console.log(chalk.green('✓ Note modified!'));
                                displayNote(state);
                            } catch (error) {
                                console.error(chalk.red('Error modifying note:'), error);
                            }
                        }
                        break;
                    }

                    case 'show': {
                        displayNote(state);
                        break;
                    }

                    case 'edit': {
                        const { newContent } = await inquirer.prompt([
                            {
                                type: 'editor',
                                name: 'newContent',
                                message: 'Edit note:',
                                default: state.content,
                            },
                        ]);
                        state.content = newContent.trim();
                        console.log(chalk.green('✓ Note updated!'));
                        displayNote(state);
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

export default noteCommand;
