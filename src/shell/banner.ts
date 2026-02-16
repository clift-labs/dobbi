/**
 * Startup banner for the Dobbie interactive shell.
 *
 * Displays ASCII art, a randomised greeting, and current state
 * (service, project, vault) every time the shell boots.
 */

import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getPersonalizedResponse } from '../responses.js';
import { getDaemonStatus } from '../service/daemon.js';
import { findVaultRoot, getActiveProject } from '../state/manager.js';

/**
 * Load the ASCII art from dobbie.txt (bundled alongside the source).
 */
async function loadAsciiArt(): Promise<string> {
    // In dev mode, read from disk
    try {
        const artPath = path.join(import.meta.dirname, '..', 'dobbie.txt');
        return await fs.readFile(artPath, 'utf-8');
    } catch {
        // Fallback if the file cannot be found (e.g. in a binary bundle)
        return '🧝 Dobbie';
    }
}

/**
 * Gather the current system state in parallel.
 */
async function gatherState(): Promise<{
    serviceRunning: boolean;
    project: string | null;
    vault: string | null;
}> {
    const [daemon, vault] = await Promise.all([
        getDaemonStatus().catch(() => ({ running: false })),
        findVaultRoot().catch(() => null),
    ]);

    let project: string | null = null;
    if (vault) {
        project = await getActiveProject().catch(() => null);
    }

    return {
        serviceRunning: daemon.running,
        project,
        vault,
    };
}

/**
 * Print the full startup banner.
 */
export async function printStartupBanner(): Promise<void> {
    // Kick off everything in parallel
    const [art, greeting, state] = await Promise.all([
        loadAsciiArt(),
        getPersonalizedResponse('startup_greeting'),
        gatherState(),
    ]);

    // ── ASCII art ───────────────────────────────────────────────────────
    console.log(chalk.cyan(art));

    // ── Greeting ────────────────────────────────────────────────────────
    console.log(chalk.bold.cyan(greeting));
    console.log('');

    // ── State summary ───────────────────────────────────────────────────
    const serviceIcon = state.serviceRunning
        ? chalk.green('●') + chalk.white(' Service running')
        : chalk.red('○') + chalk.white(' Service stopped');

    const projectLabel = state.project
        ? chalk.white(`📁 ${state.project}`)
        : chalk.gray('📁 no project');

    const vaultLabel = state.vault
        ? chalk.white(`🏠 ${path.basename(state.vault)}`)
        : chalk.yellow('🏠 no vault (run dobbie init)');

    console.log(`  ${serviceIcon}  │  ${projectLabel}  │  ${vaultLabel}`);
    console.log(chalk.gray('  Tab-complete commands • Up/Down for history • Type "exit" or Ctrl+D to leave\n'));
}
