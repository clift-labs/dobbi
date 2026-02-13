import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { getActiveProject, getVaultRoot } from '../state/manager.js';
import { getContextString } from '../context/reader.js';
import { getModelForCapability, createDobbieSystemPrompt } from '../llm/router.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';

export const todayCommand = new Command('today')
    .description('Show daily todos and notes')
    .action(async () => {
        const spinner = ora(getResponse('processing')).start();

        try {
            const vaultRoot = await getVaultRoot();
            const today = new Date().toISOString().split('T')[0];
            const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            // Get active project
            const activeProject = await getActiveProject();

            // Gather global todos
            const globalTodosPath = path.join(vaultRoot, 'global', 'todos');
            let globalTodos = '';
            try {
                const files = await fs.readdir(globalTodosPath);
                for (const file of files) {
                    if (file.endsWith('.md') && !file.startsWith('.')) {
                        const content = await fs.readFile(path.join(globalTodosPath, file), 'utf-8');
                        globalTodos += content + '\n\n';
                    }
                }
            } catch (err) {
                debug('today', err);
                // No todos folder or empty
            }

            // Gather schedule
            const schedulePath = path.join(vaultRoot, 'global', 'schedule');
            let schedule = '';
            try {
                const files = await fs.readdir(schedulePath);
                for (const file of files) {
                    if (file.endsWith('.md') && !file.startsWith('.')) {
                        const content = await fs.readFile(path.join(schedulePath, file), 'utf-8');
                        schedule += content + '\n\n';
                    }
                }
            } catch (err) {
                debug('today', err);
                // No schedule folder or empty
            }

            // Gather project todos if active
            let projectTodos = '';
            if (activeProject) {
                const projectTodosPath = path.join(vaultRoot, 'projects', activeProject, 'todos');
                try {
                    const files = await fs.readdir(projectTodosPath);
                    for (const file of files) {
                        if (file.endsWith('.md') && !file.startsWith('.')) {
                            const content = await fs.readFile(path.join(projectTodosPath, file), 'utf-8');
                            projectTodos += content + '\n\n';
                        }
                    }
                } catch (err) {
                    debug('today', err);
                    // No project todos
                }
            }

            spinner.stop();

            // Display header
            console.log(chalk.bold.cyan(`\n📋 Today - ${dayName}, ${today}\n`));

            // Display active project
            if (activeProject) {
                console.log(chalk.bold.yellow(`🎯 Active Project: ${activeProject}\n`));
            } else {
                console.log(chalk.gray('No active project set. Use `dobbie project switch <name>` to set one.\n'));
            }

            // Try to use AI to summarize
            try {
                const context = await getContextString(vaultRoot);
                const llm = await getModelForCapability('summarize');
                const systemPrompt = createDobbieSystemPrompt(context);

                const prompt = `Please provide a helpful summary of today's tasks and schedule for the user. Be concise and prioritize the most important items.

Today's Date: ${today}

Global Todos:
${globalTodos || '(No global todos)'}

Schedule:
${schedule || '(No scheduled events)'}

${activeProject ? `Project "${activeProject}" Todos:\n${projectTodos || '(No project todos)'}\n` : ''}

Provide a prioritized summary of what the user should focus on today.`;

                const spinner2 = ora(getResponse('thinking')).start();
                const response = await llm.chat(
                    [{ role: 'user', content: prompt }],
                    { systemPrompt }
                );
                spinner2.stop();

                console.log(response);
            } catch (error) {
                // Fall back to simple display if AI not configured
                console.log(chalk.bold('📝 Global Todos:'));
                console.log(globalTodos || chalk.gray('  No todos yet.\n'));

                if (schedule) {
                    console.log(chalk.bold('📅 Schedule:'));
                    console.log(schedule);
                }

                if (projectTodos) {
                    console.log(chalk.bold(`📁 ${activeProject} Todos:`));
                    console.log(projectTodos);
                }

                console.log(chalk.gray('\n(Configure AI with `dobbie config add-provider claude` for smart summaries)'));
            }

        } catch (error) {
            spinner.stop();
            console.error(chalk.red(getResponse('error')), error);
        }
    });

export default todayCommand;
