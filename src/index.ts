#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { todayCommand } from './commands/today.js';
import { rememberCommand } from './commands/remember.js';
import { projectCommand } from './commands/project.js';
import { configCommand } from './commands/config.js';
import { syncCommand } from './commands/sync.js';
import { initCommand } from './commands/init.js';
import { noteCommand } from './commands/note.js';
import { todoCommand } from './commands/todo.js';
import { listTools, getTool } from './tools/index.js';

const program = new Command();

program
    .name('dobbie')
    .description(chalk.cyan('🧝 Dobbie - Your helpful AI notes assistant'))
    .version('1.0.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(todayCommand);
program.addCommand(rememberCommand);
program.addCommand(projectCommand);
program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(noteCommand);
program.addCommand(todoCommand);

// Tool command - run any registered tool
program
    .command('tool <name> [input]')
    .description('Run a tool')
    .action(async (name: string, input?: string) => {
        const tool = getTool(name);

        if (!tool) {
            console.log(chalk.red(`Unknown tool: ${name}`));
            console.log(chalk.gray('\nAvailable tools:'));
            for (const t of listTools()) {
                console.log(chalk.gray(`  - ${t.name}: ${t.description}`));
            }
            return;
        }

        try {
            const result = await tool.execute(input || '');
            console.log(result);
        } catch (error) {
            console.error(chalk.red('Dobbie encountered an error, sir:'), error);
        }
    });

// Tools list command
program
    .command('tools')
    .description('List available tools')
    .action(() => {
        console.log(chalk.cyan('\n🔧 Available Tools:\n'));
        for (const tool of listTools()) {
            const typeIcon = tool.type === 'deterministic' ? '⚡' : '🤖';
            console.log(`  ${typeIcon} ${chalk.bold(tool.name)}`);
            console.log(chalk.gray(`     ${tool.description}`));
            console.log('');
        }
    });

// Default greeting
program
    .action(() => {
        console.log(chalk.cyan(`
🧝 Dobbie is at your service, sir!

${chalk.bold('Vault Commands:')}
  ${chalk.bold('dobbie init')}                          - Create a new vault here
  ${chalk.bold('dobbie sync')}                          - Sync with GitHub
  ${chalk.bold('dobbie today')}                         - See your daily tasks

${chalk.bold('Project Commands:')}
  ${chalk.bold('dobbie project')}                       - Show active project
  ${chalk.bold('dobbie project list')}                  - List all projects
  ${chalk.bold('dobbie project new <name>')}            - Create a new project
  ${chalk.bold('dobbie project switch <name>')}         - Switch to a project

${chalk.bold('Memory Commands:')}
  ${chalk.bold('dobbie note [title]')}                  - Interactive note with AI editing
  ${chalk.bold('dobbie todo [title]')}                  - Interactive todo with AI assistance
  ${chalk.bold('dobbie remember "<text>"')}             - Remember something (project)
  ${chalk.bold('dobbie remember -g "<text>"')}          - Remember something (global)

${chalk.bold('Config Commands:')}
  ${chalk.bold('dobbie config')}                        - Show current config
  ${chalk.bold('dobbie config add-provider <name>')}    - Add LLM provider API key
  ${chalk.bold('dobbie config set-capability <cap> <provider> <model>')}
  ${chalk.bold('dobbie config list-capabilities')}      - Show LLM capabilities
  ${chalk.bold('dobbie config list-providers')}         - Show available providers

${chalk.bold('Tools:')}
  ${chalk.bold('dobbie tools')}                         - List available tools
  ${chalk.bold('dobbie tool <name> [input]')}           - Run a tool

Use ${chalk.bold('dobbie --help')} for more options, sir.
`));
    });

program.parse();
