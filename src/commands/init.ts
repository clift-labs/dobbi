import { Command } from 'commander';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { findVaultRoot } from '../state/manager.js';

export const initCommand = new Command('init')
    .description('Initialize a new dobbie vault in the current directory')
    .action(async () => {
        const cwd = process.cwd();
        const socksPath = path.join(cwd, '.socks.md');

        // Check if already a vault
        const existingVault = await findVaultRoot();
        if (existingVault === cwd) {
            console.log(chalk.yellow('This directory is already a dobbie vault, sir.'));
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
            console.log(chalk.yellow('.socks.md already exists. This is already a vault, sir.'));
            return;
        } catch (err) {
            debug('init', err);
            // Good, doesn't exist
        }

        console.log(chalk.gray('Creating a new dobbie vault...'));

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

Dobbie is a helpful, polite English house-elf. He is:
- Always respectful, addressing the user as "sir" or "boss"
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
        const gitignore = `# Local state
.state.json

# OS files
.DS_Store
`;
        try {
            await fs.access(path.join(cwd, '.gitignore'));
            await fs.appendFile(path.join(cwd, '.gitignore'), '\n' + gitignore);
        } catch (err) {
            debug('init', err);
            await fs.writeFile(path.join(cwd, '.gitignore'), gitignore);
        }

        console.log(chalk.green(`\n✓ Dobbie vault created, sir!`));
        console.log(chalk.gray(`\nCreated:`));
        console.log(chalk.gray(`  .socks.md           - Root context`));
        console.log(chalk.gray(`  projects/           - Your projects`));
        console.log(chalk.gray(`  global/todos/       - Cross-project todos`));
        console.log(chalk.gray(`  global/schedule/    - Calendar/schedule`));
        console.log(chalk.cyan(`\nDobbie is ready to serve in this vault!`));
    });

export default initCommand;
