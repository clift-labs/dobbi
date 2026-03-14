// ─────────────────────────────────────────────────────────────────────────────
// Execution Logger — per-execution JSON logs for process learning
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import path from 'path';
import { getLogsDir } from '../paths.js';

export interface ExecutionLog {
    timestamp: string;
    chat_id: string;
    user_input: string;
    process_source: 'reuse' | 'custom';
    process_key: string;
    process_json: Record<string, unknown>;
    context_result: Record<string, unknown>;
    success: boolean;
    outcome_summary: string;
    iterations: number;
}

/**
 * Write a single execution log as a JSON file to {vault}/.dobbi/logs/.
 */
export async function writeExecutionLog(log: ExecutionLog): Promise<void> {
    const dir = await getLogsDir();
    await fs.mkdir(dir, { recursive: true });

    const filename = `${log.chat_id}.exec.json`;
    await fs.writeFile(
        path.join(dir, filename),
        JSON.stringify(log, null, 2),
    );
}

/**
 * Read recent execution logs from the vault, filtered by age.
 */
export async function readRecentExecutionLogs(maxAgeDays = 7): Promise<ExecutionLog[]> {
    const dir = await getLogsDir();
    let files: string[];
    try {
        files = await fs.readdir(dir);
    } catch {
        return [];
    }

    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    const logs: ExecutionLog[] = [];

    for (const file of files) {
        if (!file.endsWith('.exec.json')) continue;
        try {
            const raw = await fs.readFile(path.join(dir, file), 'utf-8');
            const log = JSON.parse(raw) as ExecutionLog;
            if (new Date(log.timestamp) >= cutoff) {
                logs.push(log);
            }
        } catch {
            // Skip invalid files
        }
    }

    return logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
