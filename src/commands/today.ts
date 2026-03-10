import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { getVaultRoot } from '../state/manager.js';
import { getContextString } from '../context/reader.js';
import { getModelForCapability, createDobbiSystemPrompt } from '../llm/router.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';
import { getActiveTodonts } from './todont.js';

export const todayCommand = new Command('today')
    .description('Show daily todos and notes')
    .action(async () => {
        const spinner = ora(getResponse('processing')).start();

        try {
            const vaultRoot = await getVaultRoot();
            const today = new Date().toISOString().split('T')[0];
            const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

            // Gather todos
            const todosPath = path.join(vaultRoot, 'todos');
            let allTodos = '';
            try {
                const files = await fs.readdir(todosPath);
                for (const file of files) {
                    if (file.endsWith('.md') && !file.startsWith('.')) {
                        const content = await fs.readFile(path.join(todosPath, file), 'utf-8');
                        allTodos += content + '\n\n';
                    }
                }
            } catch (err) {
                debug('today', err);
                // No todos folder or empty
            }

            // Gather events
            const eventsPath = path.join(vaultRoot, 'events');
            let schedule = '';
            try {
                const files = await fs.readdir(eventsPath);
                for (const file of files) {
                    if (file.endsWith('.md') && !file.startsWith('.')) {
                        const content = await fs.readFile(path.join(eventsPath, file), 'utf-8');
                        schedule += content + '\n\n';
                    }
                }
            } catch (err) {
                debug('today', err);
                // No events folder or empty
            }

            // Gather active todonts
            const activeTodonts = await getActiveTodonts(today);
            let todontSection = '';
            for (const t of activeTodonts) {
                const window = t.startDate && t.endDate ? ` (${t.startDate} → ${t.endDate})` : '';
                todontSection += `- 🚫 ${t.title}${window}\n`;
                if (t.content) todontSection += `  ${t.content}\n`;
            }

            spinner.stop();

            // Display header
            console.log(chalk.bold.cyan(`\n📋 Today - ${dayName}, ${today}\n`));

            // Try to use AI to summarize
            try {
                const context = await getContextString(vaultRoot);
                const llm = await getModelForCapability('summarize');
                const systemPrompt = createDobbiSystemPrompt(context);

                const prompt = `Please provide a helpful summary of today's tasks and schedule for the user. Be concise and prioritize the most important items.

Today's Date: ${today}

Todos:
${allTodos || '(No todos)'}

Schedule:
${schedule || '(No scheduled events)'}

${todontSection ? `🚫 Things to AVOID today:\n${todontSection}` : ''}

Provide a prioritized summary of what the user should focus on today. If there are todonts (things to avoid), remind the user about them.`;

                const spinner2 = ora(getResponse('thinking')).start();
                const response = await llm.chat(
                    [{ role: 'user', content: prompt }],
                    { systemPrompt }
                );
                spinner2.stop();

                console.log(response);
            } catch (error) {
                // Fall back to simple display if AI not configured
                console.log(chalk.bold('📝 Todos:'));
                console.log(allTodos || chalk.gray('  No todos yet.\n'));

                if (schedule) {
                    console.log(chalk.bold('📅 Schedule:'));
                    console.log(schedule);
                }

                if (activeTodonts.length > 0) {
                    console.log(chalk.bold.red('🚫 Todonts (avoid today):'));
                    for (const t of activeTodonts) {
                        const window = t.startDate && t.endDate ? chalk.gray(` ${t.startDate} → ${t.endDate}`) : chalk.gray(' always');
                        console.log(`  🚫 ${chalk.red(t.title)}${window}`);
                    }
                    console.log('');
                }

                console.log(chalk.gray('\n(Configure AI with `dobbi config add-provider anthropic` for smart summaries)'));
            }

        } catch (error) {
            spinner.stop();
            console.error(chalk.red(getResponse('error')), error);
        }
    });

export default todayCommand;
