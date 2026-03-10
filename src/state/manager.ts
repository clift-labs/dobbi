import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { StateSchema, type State } from '../schemas/index.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';
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
    state.interviewComplete = true;
    await saveState(state);
}

/**
 * @deprecated Use getVaultRoot() instead
 */
export async function getDobbiRootPath(): Promise<string> {
    return getVaultRoot();
}
