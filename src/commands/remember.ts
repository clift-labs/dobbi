import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { requireProject, getVaultRoot } from '../state/manager.js';
import { getProjectContext } from '../context/reader.js';
import { getModelForCapability, createDobbieSystemPrompt } from '../llm/router.js';
import { appendToMarkdown } from '../markdown/parser.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';

export const rememberCommand = new Command('remember')
    .description('Add something to context or notes')
    .argument('<text>', 'What to remember')
    .option('-g, --global', 'Add to global context instead of project')
    .action(async (text: string, options: { global?: boolean }) => {
        try {
            const vaultRoot = await getVaultRoot();
            const today = new Date().toISOString().split('T')[0];

            let targetPath: string;

            if (options.global) {
                // Add to global .socks.md
                targetPath = path.join(vaultRoot, 'global', '.socks.md');
                console.log(chalk.gray('Adding to global context, sir.'));
            } else {
                // Require a project
                const project = await requireProject();
                targetPath = path.join(vaultRoot, 'projects', project, '.socks.md');
                console.log(chalk.gray(`Adding to project "${project}", sir.`));
            }

            const spinner = ora(getResponse('processing')).start();

            try {
                // Try to use AI to format the note
                const context = options.global ? '' : await getProjectContext(await requireProject());
                const llm = await getModelForCapability('format');
                const systemPrompt = createDobbieSystemPrompt(context);

                const prompt = `The user wants to remember the following. Format it nicely as a markdown note with an appropriate heading. Keep it concise but clear. Add relevant tags if appropriate.

User input: ${text}

Format the response as markdown that can be appended to an existing document.`;

                const formattedNote = await llm.chat(
                    [{ role: 'user', content: prompt }],
                    { systemPrompt }
                );

                spinner.stop();

                // Append to the target file
                const noteWithDate = `\n## Note - ${today}\n\n${formattedNote}`;

                try {
                    await appendToMarkdown(targetPath, noteWithDate);
                } catch (err) {
                    debug('remember', err);
                    // File doesn't exist or can't be parsed, just append
                    await fs.appendFile(targetPath, noteWithDate);
                }

                console.log(chalk.green('✓ ' + getResponse('remember_saved')));
                console.log(chalk.gray(formattedNote));

            } catch (err) {
                console.debug('[dobbie:commands:remember]', err);
                spinner.stop();

                // Fall back to simple append without AI
                const simpleNote = `\n## Note - ${today}\n\n${text}\n`;

                try {
                    await fs.appendFile(targetPath, simpleNote);
                } catch (err) {
                    debug('remember', err);
                    // Create the directory and file if needed
                    await fs.mkdir(path.dirname(targetPath), { recursive: true });
                    await fs.writeFile(targetPath, simpleNote);
                }

                console.log(chalk.green('✓ Dobbie has noted that, sir!'));
                console.log(chalk.gray('(Configure AI with `dobbie config add-provider claude` for smart formatting)'));
            }

        } catch (error) {
            console.error(chalk.red(getResponse('error')), error);
        }
    });

export default rememberCommand;
