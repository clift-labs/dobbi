#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { todayCommand } from './commands/today.js';
import { weekCommand } from './commands/week.js';
import { rememberCommand } from './commands/remember.js';
import { projectCommand } from './commands/project.js';
import { configCommand } from './commands/config.js';
import { syncCommand } from './commands/sync.js';
import { initCommand } from './commands/init.js';
import { noteCommand } from './commands/note.js';
import { todoCommand } from './commands/todo.js';
import { eventCommand } from './commands/event.js';
import { researchCommand } from './commands/research.js';
import { recurrenceCommand } from './commands/recurrence.js';
import { personCommand } from './commands/person.js';
import { inboxCommand } from './commands/inbox.js';
import { serviceCommand, queueCommand, indexCommand } from './commands/service.js';
import { createShellCommand } from './commands/shell.js';
import { feralCommand } from './commands/feral.js';
import { interviewCommand } from './commands/interview.js';
import { listServiceTools, getServiceTool } from './tools/index.js';
import { bootstrapFeral } from './feral/bootstrap.js';

export const program = new Command();

program
  .name('dobbie')
  .description(chalk.cyan('🧝 Dobbie - Your helpful AI notes assistant'))
  .version('1.0.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(todayCommand);
program.addCommand(weekCommand);
program.addCommand(rememberCommand);
program.addCommand(projectCommand);
program.addCommand(configCommand);
program.addCommand(syncCommand);
program.addCommand(noteCommand);
program.addCommand(todoCommand);
program.addCommand(eventCommand);
program.addCommand(researchCommand);
program.addCommand(recurrenceCommand);
program.addCommand(personCommand);
program.addCommand(inboxCommand);
program.addCommand(serviceCommand);
program.addCommand(queueCommand);
program.addCommand(indexCommand);
program.addCommand(feralCommand);
program.addCommand(interviewCommand);
program.addCommand(createShellCommand(program));

// Tool command - run any registered tool
program
  .command('tool <name> [input]')
  .description('Run a tool')
  .action(async (name: string, input?: string) => {
    const feral = await bootstrapFeral();
    const tool = feral.toolRegistry.getTool(name) ?? getServiceTool(name);

    if (!tool) {
      console.log(chalk.red(`Unknown tool: ${name}`));
      console.log(chalk.gray('\nAvailable tools:'));
      const allTools = [...feral.toolRegistry.listTools(), ...listServiceTools()];
      const seen = new Set<string>();
      for (const t of allTools) {
        if (seen.has(t.name)) continue;
        seen.add(t.name);
        console.log(chalk.gray(`  - ${t.name}: ${t.description}`));
      }
      return;
    }

    console.log(chalk.gray(`Running ${tool.name} (V2 service tool)...`));
    console.log(chalk.gray('Note: Service tools require the daemon to be running for full functionality.'));
  });

// Tools list command
program
  .command('tools')
  .description('List available tools')
  .action(async () => {
    const feral = await bootstrapFeral();
    const allTools = [...feral.toolRegistry.listTools(), ...listServiceTools()];
    const seen = new Set<string>();

    console.log(chalk.cyan('\n🔧 Available Tools:\n'));
    for (const tool of allTools) {
      if (seen.has(tool.name)) continue;
      seen.add(tool.name);
      const typeIcon = tool.type === 'deterministic' ? '⚡' : '🤖';
      console.log(`  ${typeIcon} ${chalk.bold(tool.name)}`);
      console.log(chalk.gray(`     ${tool.description}`));
      console.log('');
    }
  });

// Default: launch interactive shell when no command is given
program
  .action(async () => {
    // Delegate to the shell command
    await program.parseAsync(['node', 'dobbie', 'shell']);
  });

program.parse();
