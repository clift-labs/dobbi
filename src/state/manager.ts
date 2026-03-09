import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { StateSchema, type State } from '../schemas/index.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';
import { DEFAULT_ENTITY_TYPES } from '../entities/entity-types-defaults.js';
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
 * Also checks the DOBBI_VAULT env var (set by the daemon on startup).
 * Returns null if no vault is found.
 */
export async function findVaultRoot(): Promise<string | null> {
    if (cachedVaultRoot) {
        return cachedVaultRoot;
    }

    // If DOBBI_VAULT is set (e.g. by the daemon), trust it directly
    const envVault = process.env.DOBBI_VAULT;
    if (envVault) {
        const socksPath = path.join(envVault, SOCKS_FILE);
        try {
            await fs.access(socksPath);
            cachedVaultRoot = envVault;
            return envVault;
        } catch {
            // Env var points to invalid vault, fall through to cwd scan
        }
    }

    const systemCupboard = path.join(os.homedir(), '.dobbi');
    let currentDir = process.cwd();

    while (currentDir !== path.dirname(currentDir)) {
        // Never treat the system cupboard (~/.dobbi/) as a vault
        if (currentDir === systemCupboard) {
            currentDir = path.dirname(currentDir);
            continue;
        }
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
        console.error(chalk.red('\n🤖 Dobbi cannot find a vault here, sir.'));
        console.error(chalk.gray('No .socks.md found in this directory or any parent.'));
        console.error(chalk.gray('\nTo create a vault, run: dobbi init'));
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

/**
 * Honorific pools by gender — Dobbi picks randomly from these each time.
 */
export const HONORIFIC_POOLS: Record<string, string[]> = {
    male: ['sir', 'boss', 'master', 'chief', 'captain', 'guv', 'my lord', 'good sir'],
    female: ['ma\'am', 'miss', 'madam', 'my lady', 'boss', 'chief', 'mistress'],
    other: ['boss', 'chief', 'captain', 'friend', 'guv', 'my liege', 'comrade'],
};

/**
 * Gets a random honorific from the user's gender pool.
 * Falls back to 'friend' if gender isn't set.
 */
export async function getUserHonorific(): Promise<string> {
    const state = await loadState();
    const gender = state.gender || 'other';
    const pool = HONORIFIC_POOLS[gender] || HONORIFIC_POOLS.other;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Gets the user's gender from state.
 */
export async function getUserGender(): Promise<string | undefined> {
    const state = await loadState();
    return state.gender;
}

/**
 * Sets the user's gender in state.
 */
export async function setUserGender(gender: 'male' | 'female' | 'other'): Promise<void> {
    const state = await loadState();
    state.gender = gender;
    await saveState(state);
}

/**
 * Whether the onboarding interview has been completed.
 */
export async function isInterviewComplete(): Promise<boolean> {
    const state = await loadState();
    return state.interviewComplete === true;
}

/**
 * Save the full user profile from the onboarding interview.
 */
export async function saveProfile(profile: {
    userName: string;
    honorific?: string;
    gender?: 'male' | 'female' | 'other';
    workType?: string;
    familySituation?: string;
    hasCar?: boolean;
    cityLive?: string;
    cityWork?: string;
    personalCalUrl?: string;
    workCalUrl?: string;
    firstProject?: string;
}): Promise<void> {
    const state = await loadState();
    state.userName = profile.userName;
    if (profile.honorific) state.honorific = profile.honorific;
    if (profile.gender) state.gender = profile.gender;
    state.workType = profile.workType;
    state.familySituation = profile.familySituation;
    state.hasCar = profile.hasCar;
    state.cityLive = profile.cityLive;
    state.cityWork = profile.cityWork;
    state.personalCalUrl = profile.personalCalUrl;
    state.workCalUrl = profile.workCalUrl;
    state.firstProject = profile.firstProject;
    state.interviewComplete = true;
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
    console.log(chalk.yellow("\nDobbi needs to know which project, sir."));

    const projects = await listProjects();

    if (projects.length === 0) {
        console.log(chalk.gray("No projects exist yet. Dobbi will create one for you, sir."));
        const { projectName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'projectName',
                message: 'What shall Dobbi call this project, sir?',
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
    const today = new Date().toISOString().split('T')[0];

    // New projects start with only the two built-in entity types (task + note).
    // Users can add more types later via `dobbi type add`.
    const folders = DEFAULT_ENTITY_TYPES.map(t => t.directory);
    // Always include inbox (not an entity type but used for quick capture)
    if (!folders.includes('inbox')) folders.push('inbox');

    // Create all entity directories
    for (const folder of folders) {
        await fs.mkdir(path.join(projectDir, folder), { recursive: true });
    }

    // Create project .socks.md
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
    for (const folder of folders) {
        const label = folder.charAt(0).toUpperCase() + folder.slice(1);
        const folderSocks = `---
title: "${name} ${label} Context"
created: ${today}
tags: [context, ${folder}]
---

# ${name} - ${label}

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
export async function getDobbiRootPath(): Promise<string> {
    return getVaultRoot();
}
