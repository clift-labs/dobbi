import { promises as fs } from 'fs';
import path from 'path';
import { debug } from '../../utils/debug.js';
import os from 'os';
import type { Task } from '../protocol.js';

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

const DOBBIE_DIR = path.join(os.homedir(), '.dobbie');
const QUEUE_STATE_FILE = path.join(DOBBIE_DIR, 'queue-state.json');

interface PersistedQueueState {
    queue: { task: Task; addedAt: string }[];
    completedCount: number;
    errorCount: number;
    savedAt: string;
}

/**
 * Saves queue state to disk so it can survive daemon restarts.
 */
export async function saveQueueState(
    queue: { task: Task; addedAt: Date }[],
    completedCount: number,
    errorCount: number,
): Promise<void> {
    try {
        await fs.mkdir(DOBBIE_DIR, { recursive: true });
        const state: PersistedQueueState = {
            queue: queue.map(e => ({
                task: e.task,
                addedAt: e.addedAt.toISOString(),
            })),
            completedCount,
            errorCount,
            savedAt: new Date().toISOString(),
        };
        await fs.writeFile(QUEUE_STATE_FILE, JSON.stringify(state, null, 2));
    } catch (err) {
        console.debug('[dobbie:queue-persistence] Failed to save state:', (err as Error).message);
    }
}

/**
 * Loads queue state from disk. Returns null if no saved state exists.
 */
export async function loadQueueState(): Promise<PersistedQueueState | null> {
    try {
        const data = await fs.readFile(QUEUE_STATE_FILE, 'utf-8');
        return JSON.parse(data) as PersistedQueueState;
    } catch (err) {
        debug('queue-persistence', err);
        return null;
    }
}

/**
 * Clears persisted queue state from disk.
 */
export async function clearQueueState(): Promise<void> {
    try {
        await fs.unlink(QUEUE_STATE_FILE);
    } catch (err) {
        debug('queue-persistence', err);
    }
}
