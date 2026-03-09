import { Command } from 'commander';
import { debug } from '../utils/debug.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { findVaultRoot } from '../state/manager.js';
import { initEntityTypes } from '../entities/entity-type-config.js';
import { setApiKey, PROVIDER_MODELS, getConfiguredProviders } from '../config.js';
import { startDaemon } from '../service/daemon.js';

const CUPBOARD_DIR = path.join(os.homedir(), '.dobbi');

export const initCommand = new Command('init')
    .description('Initialize a new dobbi vault in the current directory')
    .action(async () => {
        const cwd = process.cwd();

        // Reject init inside the system cupboard
        if (cwd === path.join(os.homedir(), '.dobbi')) {
            console.log(chalk.red('~/.dobbi/ is reserved for Dobbi\'s system config, sir.'));
            console.log(chalk.gray('Please run `dobbi init` from a different directory.'));
            return;
        }

        const socksPath = path.join(cwd, '.socks.md');

        // Check if already a vault
        const existingVault = await findVaultRoot();
        if (existingVault === cwd) {
            console.log(chalk.yellow('This directory is already a dobbi vault.'));
            return;
        }

        if (existingVault) {
            console.log(chalk.yellow(`A parent vault exists at: ${existingVault}`));
            console.log(chalk.gray('Creating a vault here would create a nested vault.'));
            return;
        }

        // Check if .socks.md already exists
        try {
            await fs.access(socksPath);
            console.log(chalk.yellow('.socks.md already exists. This is already a vault.'));
            return;
        } catch {
            // Good, doesn't exist
        }

        console.log(chalk.gray('Creating a new dobbi vault...'));

        const today = new Date().toISOString().split('T')[0];
        const vaultName = path.basename(cwd);

        // Create root .socks.md
        const rootSocks = `---
title: "${vaultName} Vault"
created: ${today}
tags: [context, system, root]
---

# ${vaultName}

## Personality

Dobbi is a helpful, polite English house-elf. He is:
- Always respectful, using varied honorifics
- Eager to assist with any task
- Formal but warm in tone
- Humble and dedicated to serving well

## Global Rules

- All markdown files use YAML frontmatter
- Context is read from deepest folder up to root
- Projects are first-class citizens

## User Preferences

- Timezone: Local machine time
- Date format: YYYY-MM-DD
`;
        await fs.writeFile(socksPath, rootSocks);

        // Ensure ~/.dobbi/ cupboard exists for config & secrets
        await fs.mkdir(CUPBOARD_DIR, { recursive: true });

        // Seed entity-types.json in ~/.dobbi/
        await initEntityTypes();

        // Create projects folder
        await fs.mkdir(path.join(cwd, 'projects'), { recursive: true });
        await fs.writeFile(path.join(cwd, 'projects', '.socks.md'), `---
title: "Projects Context"
created: ${today}
tags: [context, projects]
---

# Projects

Each project has its own folder with todos, notes, and research.
`);

        // Create global folder with todos and schedule
        await fs.mkdir(path.join(cwd, 'global', 'todos'), { recursive: true });
        await fs.mkdir(path.join(cwd, 'global', 'schedule'), { recursive: true });

        await fs.writeFile(path.join(cwd, 'global', '.socks.md'), `---
title: "Global Context"
created: ${today}
tags: [context, global]
---

# Global

Cross-project items that apply everywhere.
`);

        await fs.writeFile(path.join(cwd, 'global', 'todos', '.socks.md'), `---
title: "Global Todos Context"
created: ${today}
tags: [context, todos, global]
---

# Global Todos

Tasks that cut across all projects.
`);

        await fs.writeFile(path.join(cwd, 'global', 'schedule', '.socks.md'), `---
title: "Schedule Context"
created: ${today}
tags: [context, schedule, global]
---

# Schedule

Time-blocked events and appointments.
`);

        // Create .gitignore
        const gitignore = `.state.json
.DS_Store
`;
        try {
            await fs.access(path.join(cwd, '.gitignore'));
            await fs.appendFile(path.join(cwd, '.gitignore'), '\n' + gitignore);
        } catch {
            await fs.writeFile(path.join(cwd, '.gitignore'), gitignore);
        }

        console.log(chalk.green('\n✓ Vault created!'));

        // ── Cupboard setup (only on first-ever init) ────────────────────
        const configured = await getConfiguredProviders();
        if (configured.length === 0) {
            console.log(chalk.cyan('\n🔑 Dobbi needs an API key to think, sir.\n'));

            const knownProviders = Object.keys(PROVIDER_MODELS);
            const { provider } = await inquirer.prompt([{
                type: 'list',
                name: 'provider',
                message: 'Which AI provider?',
                choices: knownProviders.map(p => ({ name: p, value: p })),
                default: 'openai',
            }]);

            const { apiKey } = await inquirer.prompt([{
                type: 'password',
                name: 'apiKey',
                message: `Enter ${provider} API key:`,
                mask: '*',
                validate: (input: string) => input.length > 0 || 'API key is required',
            }]);

            await setApiKey(provider, apiKey);
            console.log(chalk.green(`\n✓ ${provider} API key saved to ~/.dobbi/`));

            // Start service on first setup
            console.log(chalk.gray('\nStarting Dobbi service...'));
            try {
                const status = await startDaemon();
                if (status.running) {
                    console.log(chalk.green('✓ Service running!'));
                    console.log(chalk.cyan('  Web client: http://localhost:3737\n'));
                } else {
                    console.log(chalk.yellow('Service did not start. Run `dobbi service start` to try again.\n'));
                }
            } catch (err) {
                debug('init', err);
                console.log(chalk.yellow('Could not auto-start service. Run `dobbi service start` manually.\n'));
            }
        }

        console.log(chalk.gray(`Created:`));
        console.log(chalk.gray(`  .socks.md           - Root context`));
        console.log(chalk.gray(`  projects/           - Your projects`));
        console.log(chalk.gray(`  global/todos/       - Cross-project todos`));
        console.log(chalk.gray(`  global/schedule/    - Calendar/schedule`));
        console.log(chalk.cyan('\nRun `dobbi` to meet Dobbi and get started!'));
    });

export default initCommand;
