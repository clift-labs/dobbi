// ─────────────────────────────────────────────────────────────────────────────
// PATHS — Central path resolution for Dobbi
// ─────────────────────────────────────────────────────────────────────────────
//
// Two root directories:
//   ~/.dobbi/              Secrets + daemon runtime (pid, sock)
//   {vault}/.dobbi/        All other config, logs, processes, caches
//
// The vault/.dobbi directory is the "working" config directory. Everything
// except LLM API keys and daemon transient files lives there.
// ─────────────────────────────────────────────────────────────────────────────

import path from 'path';
import os from 'os';
import { findVaultRoot } from './state/manager.js';

/** System-level directory — only secrets and daemon runtime. */
export const SYSTEM_DIR = path.join(os.homedir(), '.dobbi');

/** Secrets always live in ~/.dobbi/ — never in the vault. */
export const SECRETS_PATH = path.join(SYSTEM_DIR, 'secrets.json');

// Daemon transient files
export const PID_FILE = path.join(SYSTEM_DIR, 'dobbi.pid');
export const SOCKET_PATH = path.join(SYSTEM_DIR, 'dobbi.sock');

/**
 * Resolve the vault-scoped .dobbi directory: {vault}/.dobbi/.
 * Falls back to ~/.dobbi/ if no vault is found (e.g. daemon started outside vault).
 */
export async function getVaultDobbiDir(): Promise<string> {
    const vaultRoot = await findVaultRoot();
    if (vaultRoot) return path.join(vaultRoot, '.dobbi');
    return SYSTEM_DIR;
}

// ── Vault-scoped config paths ────────────────────────────────────────────────

export async function getConfigPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'config.json');
}

export async function getEntityTypesPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'entity-types.json');
}

export async function getFeralCatalogPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'feral-catalog.json');
}

export async function getSkillsConfigPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'skills.json');
}

export async function getCalConfigPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'cal-config.json');
}

export async function getEmbeddingsPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'embeddings.json');
}

export async function getQueueStatePath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'queue-state.json');
}

export async function getCronConfigPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'cron-config.json');
}

export async function getDaemonLogPath(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'dobbi.log');
}

export async function getProcessesDir(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'processes');
}

export async function getLogsDir(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'logs');
}

export async function getPampDir(): Promise<string> {
    return path.join(await getVaultDobbiDir(), 'pamp');
}
