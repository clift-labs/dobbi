import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { StateSchema, type State } from '../schemas/index.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';
import inquirer from 'inquirer';
import chalk from 'chalk';

const SOCKS_FILE = '.socks.md';
const STATE_FILE = '.state.json';

let cachedVaultRoot: string | null = null;

/**
 * Reset the vault root cache.  Used by integration tests that create
 * temporary vaults so that `findVaultRoot` re-scans the directory tree.
 */
export function resetVaultCache(): void {
    cachedVaultRoot = null;
}

/**
 * Finds the vault root by looking for .socks.md in cwd or parent directories.
 * Returns null if no vault is found.
 */
export async function findVaultRoot(): Promise<string | null> {
    if (cachedVaultRoot) {
        return cachedVaultRoot;
    }

    let currentDir = process.cwd();

    while (currentDir !== path.dirname(currentDir)) {
        const socksPath = path.join(currentDir, SOCKS_FILE);
        try {
            await fs.access(socksPath);
            cachedVaultRoot = currentDir;
            return currentDir;
        } catch {
            // No .socks.md here, try parent
            currentDir = path.dirname(currentDir);
        }
    }

    return null;
}

/**
 * Gets the vault root, throwing an error if not in a vault.
 */
export async function getVaultRoot(): Promise<string> {
    const root = await findVaultRoot();

    if (!root) {
        console.error(chalk.red('\n🧝 Dobbie cannot find a vault here, sir.'));
        console.error(chalk.gray('This directory does not contain a .socks.md file.'));
        console.error(chalk.gray('\nTo create a new vault, run: dobbie init'));
        throw new Error('No vault found in current directory tree');
    }

    return root;
}

/**
 * Checks if the current directory is a valid vault.
 */
export async function isInVault(): Promise<boolean> {
    return (await findVaultRoot()) !== null;
}

function getStatePath(vaultRoot: string): string {
    return path.join(vaultRoot, STATE_FILE);
}

const DEFAULT_STATE: State = {
    activeProject: null,
    lastUsed: undefined,
};

export async function loadState(): Promise<State> {
    try {
        const vaultRoot = await getVaultRoot();
        const data = await fs.readFile(getStatePath(vaultRoot), 'utf-8');
        return StateSchema.parse(JSON.parse(data));
    } catch {
        return DEFAULT_STATE;
    }
}

export async function saveState(state: State): Promise<void> {
    const vaultRoot = await getVaultRoot();
    state.lastUsed = new Date().toISOString().split('T')[0];
    await fs.writeFile(getStatePath(vaultRoot), JSON.stringify(state, null, 2));
}

export async function getActiveProject(): Promise<string | null> {
    const state = await loadState();
    return state.activeProject;
}

export async function setActiveProject(projectName: string): Promise<void> {
    const state = await loadState();
    state.activeProject = projectName;
    await saveState(state);
}

/**
 * Gets the user's name from state, falling back to OS username.
 */
export async function getUserName(): Promise<string> {
    const state = await loadState();
    return state.userName || os.userInfo().username || 'sir';
}

/**
 * Sets the user's name in state.
 */
export async function setUserName(name: string): Promise<void> {
    const state = await loadState();
    state.userName = name;
    await saveState(state);
}

export async function clearActiveProject(): Promise<void> {
    const state = await loadState();
    state.activeProject = null;
    await saveState(state);
}

export async function requireProject(): Promise<string> {
    const activeProject = await getActiveProject();

    if (activeProject) {
        return activeProject;
    }

    // Prompt the user for a project
    console.log(chalk.yellow("\nDobbie needs to know which project, sir."));

    const projects = await listProjects();

    if (projects.length === 0) {
        console.log(chalk.gray("No projects exist yet. Dobbie will create one for you, sir."));
        const { projectName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: 'What shall Dobbie call this project, sir?',
                validate: (input: string) => input.length > 0 || 'Please enter a project name',
            },
        ]);
        await createProject(projectName);
        await setActiveProject(projectName);
        return projectName;
    }

    const { selectedProject } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedProject',
            message: 'What project, sir?',
            choices: projects,
        },
    ]);

    await setActiveProject(selectedProject);
    return selectedProject;
}

export async function listProjects(): Promise<string[]> {
    const vaultRoot = await getVaultRoot();
    const projectsDir = path.join(vaultRoot, 'projects');

    try {
        const entries = await fs.readdir(projectsDir, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
            .map(entry => entry.name);
    } catch (err) {
        debug('state', err);
        return [];
    }
}

export async function createProject(name: string): Promise<void> {
    const vaultRoot = await getVaultRoot();
    const projectDir = path.join(vaultRoot, 'projects', name);

    // Create project directories
    await fs.mkdir(path.join(projectDir, 'notes'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'todos'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'research'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'events'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'inbox'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'goals'), { recursive: true });

    // Create project .socks.md
    const today = new Date().toISOString().split('T')[0];
    const socksContent = `---
title: "${name} Context"
created: ${today}
tags: [context, project]
---

# ${name}

Project-specific context and notes.

## Goals

-

## Notes

-
`;

    await fs.writeFile(path.join(projectDir, '.socks.md'), socksContent);

    // Create sub-folder .socks.md files
    const subFolders = ['notes', 'todos', 'research', 'events', 'inbox', 'goals'];
    for (const folder of subFolders) {
        const folderSocks = `---
title: "${name} ${folder.charAt(0).toUpperCase() + folder.slice(1)} Context"
created: ${today}
tags: [context, ${folder}]
---

# ${name} - ${folder.charAt(0).toUpperCase() + folder.slice(1)}

`;
        await fs.writeFile(path.join(projectDir, folder, '.socks.md'), folderSocks);
    }
}

export async function projectExists(name: string): Promise<boolean> {
    const vaultRoot = await getVaultRoot();
    const projectDir = path.join(vaultRoot, 'projects', name);
    try {
        const stat = await fs.stat(projectDir);
        return stat.isDirectory();
    } catch (err) {
        debug('state', err);
        return false;
    }
}

/**
 * @deprecated Use getVaultRoot() instead
 */
export async function getDobbieRootPath(): Promise<string> {
    return getVaultRoot();
}
