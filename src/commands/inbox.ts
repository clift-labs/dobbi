import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import { requireProject, getVaultRoot } from '../state/manager.js';
import { getInboxContext } from '../context/reader.js';
import { getModelForCapability, createDobbieSystemPrompt } from '../llm/router.js';

type ContentCategory = 'note' | 'todo' | 'event' | 'research';

interface ClassifiedContent {
    category: ContentCategory;
    title: string;
    content: string;
    metadata: {
        priority?: 'low' | 'medium' | 'high';
        startTime?: string;
        endTime?: string;
        tags?: string[];
    };
}

async function classifyContent(content: string, filename: string, project: string): Promise<ClassifiedContent> {
    const context = await getInboxContext(project);
    const llm = await getModelForCapability('reason');
    const systemPrompt = createDobbieSystemPrompt(context);

    const response = await llm.chat([
        {
            role: 'user',
            content: `Analyze the following content and classify it into one of these categories:
- note: General information, ideas, thoughts, meeting notes
- todo: Tasks, action items, things to do, reminders
- event: Scheduled activities with specific times (meetings, appointments)
- research: Reference material, articles, documentation, learning content

Also extract:
- A clear, concise title
- The cleaned-up content in markdown format
- For todos: priority (low/medium/high)
- For events: startTime and endTime in ISO format if mentioned
- Relevant tags

Respond in this exact JSON format:
{
  "category": "note|todo|event|research",
  "title": "Clear title",
  "content": "Cleaned markdown content",
  "metadata": {
    "priority": "low|medium|high",
    "startTime": "ISO datetime or null",
    "endTime": "ISO datetime or null",
    "tags": ["tag1", "tag2"]
  }
}

Original filename: ${filename}

Content to classify:
${content}`,
        },
    ], { systemPrompt });

    // Parse JSON from response
    let jsonStr = response.trim();

    // Extract JSON if wrapped in code fences
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            category: parsed.category || 'note',
            title: parsed.title || filename.replace(/\.[^/.]+$/, ''),
            content: parsed.content || content,
            metadata: parsed.metadata || {},
        };
    } catch {
        // Fallback if JSON parsing fails
        console.log(chalk.yellow('Could not parse AI response, defaulting to note'));
        return {
            category: 'note',
            title: filename.replace(/\.[^/.]+$/, ''),
            content: content,
            metadata: {},
        };
    }
}

async function saveClassifiedContent(classified: ClassifiedContent, project: string): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const today = new Date().toISOString().split('T')[0];

    const filename = classified.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '.md';

    let targetDir: string;
    let frontmatter: string;

    switch (classified.category) {
        case 'todo':
            targetDir = path.join(vaultRoot, 'projects', project, 'todos');
            frontmatter = `---
title: "${classified.title}"
created: ${today}
project: ${project}
priority: ${classified.metadata.priority || 'medium'}
completed: false
tags: [todo${classified.metadata.tags?.length ? ', ' + classified.metadata.tags.join(', ') : ''}]
---`;
            break;

        case 'event':
            targetDir = path.join(vaultRoot, 'projects', project, 'events');
            frontmatter = `---
title: "${classified.title}"
startTime: ${classified.metadata.startTime || new Date().toISOString()}
endTime: ${classified.metadata.endTime || new Date(Date.now() + 3600000).toISOString()}
project: ${project}
tags: [event${classified.metadata.tags?.length ? ', ' + classified.metadata.tags.join(', ') : ''}]
---`;
            break;

        case 'research':
            targetDir = path.join(vaultRoot, 'projects', project, 'research');
            frontmatter = `---
title: "${classified.title}"
created: ${today}
project: ${project}
tags: [research${classified.metadata.tags?.length ? ', ' + classified.metadata.tags.join(', ') : ''}]
---`;
            break;

        case 'note':
        default:
            targetDir = path.join(vaultRoot, 'projects', project, 'notes');
            frontmatter = `---
title: "${classified.title}"
created: ${today}
project: ${project}
tags: [note${classified.metadata.tags?.length ? ', ' + classified.metadata.tags.join(', ') : ''}]
---`;
            break;
    }

    await fs.mkdir(targetDir, { recursive: true });
    const filepath = path.join(targetDir, filename);

    const markdown = `${frontmatter}

${classified.content}
`;

    await fs.writeFile(filepath, markdown);
    return filepath;
}

async function processInboxItem(itemPath: string, project: string): Promise<{ success: boolean; filepath?: string; classified?: ClassifiedContent }> {
    const filename = path.basename(itemPath);
    const ext = path.extname(filename).toLowerCase();

    // Read content based on file type
    let content: string;

    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        // For images, we'd need vision capability - for now, just note the image
        content = `[Image file: ${filename}]\n\nThis image was added to the inbox and needs manual review.`;
        console.log(chalk.yellow(`  ⚠ Image files require manual classification: ${filename}`));
        return { success: false };
    } else {
        // Read as text
        content = await fs.readFile(itemPath, 'utf-8');
    }

    // Classify the content
    const classified = await classifyContent(content, filename, project);

    // Save to appropriate location
    const filepath = await saveClassifiedContent(classified, project);

    return { success: true, filepath, classified };
}

async function listInboxItems(project: string): Promise<string[]> {
    const vaultRoot = await getVaultRoot();
    const inboxDir = path.join(vaultRoot, 'projects', project, 'inbox');

    try {
        const files = await fs.readdir(inboxDir);
        return files
            .filter(f => !f.startsWith('.'))
            .map(f => path.join(inboxDir, f));
    } catch {
        return [];
    }
}

export const inboxCommand = new Command('inbox')
    .description('Process inbox items with AI classification')
    .argument('[action]', 'Action: process (default) or add')
    .argument('[content]', 'File path or text content to add')
    .action(async (action?: string, content?: string) => {
        try {
            const project = await requireProject();
            const vaultRoot = await getVaultRoot();
            const inboxDir = path.join(vaultRoot, 'projects', project, 'inbox');

            // Ensure inbox directory exists
            await fs.mkdir(inboxDir, { recursive: true });

            if (action === 'add' && content) {
                // Add content to inbox
                const today = new Date().toISOString().split('T')[0];
                const timestamp = Date.now();

                // Check if content is a file path
                try {
                    const stat = await fs.stat(content);
                    if (stat.isFile()) {
                        // Copy file to inbox
                        const ext = path.extname(content);
                        const destPath = path.join(inboxDir, `${today}-${timestamp}${ext}`);
                        await fs.copyFile(content, destPath);
                        console.log(chalk.green(`✓ Added file to inbox: ${path.basename(destPath)}`));
                        return;
                    }
                } catch {
                    // Not a file, treat as text content
                }

                // Add as text file
                const textPath = path.join(inboxDir, `${today}-${timestamp}.txt`);
                await fs.writeFile(textPath, content);
                console.log(chalk.green(`✓ Added text to inbox: ${path.basename(textPath)}`));
                return;
            }

            // Process inbox items
            const items = await listInboxItems(project);

            if (items.length === 0) {
                console.log(chalk.gray('\n📥 Inbox is empty, sir. Nothing to process.'));
                console.log(chalk.gray('\nTo add items:'));
                console.log(chalk.gray('  dobbie inbox add "Remember to call mom"'));
                console.log(chalk.gray('  dobbie inbox add /path/to/file.txt'));
                return;
            }

            console.log(chalk.cyan(`\n📥 Processing ${items.length} inbox item(s)...\n`));

            let processed = 0;
            let failed = 0;

            for (const itemPath of items) {
                const filename = path.basename(itemPath);
                console.log(chalk.gray(`Processing: ${filename}`));

                try {
                    const result = await processInboxItem(itemPath, project);

                    if (result.success && result.classified && result.filepath) {
                        const categoryIcons: Record<ContentCategory, string> = {
                            note: '📝',
                            todo: '✅',
                            event: '📅',
                            research: '📚',
                        };
                        const icon = categoryIcons[result.classified.category];

                        console.log(chalk.green(`  ${icon} → ${result.classified.category}: ${result.classified.title}`));
                        console.log(chalk.gray(`     Saved to: ${path.relative(vaultRoot, result.filepath)}`));

                        // Remove from inbox after successful processing
                        await fs.unlink(itemPath);
                        processed++;
                    } else {
                        // Ask user what to do with failed items
                        const { action: userAction } = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'action',
                                message: `Could not auto-classify "${filename}". What should Dobbie do?`,
                                choices: [
                                    { name: 'Skip (keep in inbox)', value: 'skip' },
                                    { name: 'Delete from inbox', value: 'delete' },
                                    { name: 'Manually classify as Note', value: 'note' },
                                    { name: 'Manually classify as Todo', value: 'todo' },
                                    { name: 'Manually classify as Event', value: 'event' },
                                    { name: 'Manually classify as Research', value: 'research' },
                                ],
                            },
                        ]);

                        if (userAction === 'delete') {
                            await fs.unlink(itemPath);
                            console.log(chalk.yellow(`  🗑 Deleted: ${filename}`));
                        } else if (userAction !== 'skip') {
                            // Manual classification
                            const content = await fs.readFile(itemPath, 'utf-8');
                            const manual: ClassifiedContent = {
                                category: userAction as ContentCategory,
                                title: filename.replace(/\.[^/.]+$/, ''),
                                content: content,
                                metadata: {},
                            };
                            const filepath = await saveClassifiedContent(manual, project);
                            await fs.unlink(itemPath);
                            console.log(chalk.green(`  ✓ Saved as ${userAction}: ${path.relative(vaultRoot, filepath)}`));
                            processed++;
                        } else {
                            failed++;
                        }
                    }
                } catch (error) {
                    console.error(chalk.red(`  ✗ Error processing ${filename}:`), error);
                    failed++;
                }
            }

            console.log(chalk.cyan(`\n✓ Processed ${processed} item(s)${failed > 0 ? `, ${failed} skipped` : ''}`));

        } catch (error) {
            console.error(chalk.red('Dobbie encountered an error, sir:'), error);
        }
    });

export default inboxCommand;
