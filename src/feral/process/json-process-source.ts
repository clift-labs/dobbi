// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — JSON Process Source
// ─────────────────────────────────────────────────────────────────────────────
//
// Loads process JSON files from a directory and provides them as
// Process instances via the ProcessSource interface.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import path from 'path';
import type { ProcessSource } from './process-factory.js';
import type { Process } from './process.js';
import { hydrateProcess, type ProcessConfigJson } from './process-json-hydrator.js';

/**
 * Loads all *.json files from a directory and hydrates them into Processes.
 */
export class JsonProcessSource implements ProcessSource {
    private processes: Process[] = [];
    private loaded = false;

    constructor(private directory: string) { }

    /**
     * Load processes from disk. Call once before accessing getProcesses().
     * Silently handles missing directories.
     */
    async load(): Promise<void> {
        this.processes = [];
        try {
            const files = await fs.readdir(this.directory);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                try {
                    const filepath = path.join(this.directory, file);
                    const raw = await fs.readFile(filepath, 'utf-8');
                    const json = JSON.parse(raw) as ProcessConfigJson;
                    this.processes.push(hydrateProcess(json));
                } catch {
                    // Skip invalid files
                }
            }
        } catch {
            // Directory doesn't exist — no processes to load
        }
        this.loaded = true;
    }

    getProcesses(): Process[] {
        if (!this.loaded) {
            throw new Error('JsonProcessSource.load() must be called before getProcesses().');
        }
        return this.processes;
    }
}
