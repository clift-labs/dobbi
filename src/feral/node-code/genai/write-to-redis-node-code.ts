// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Write to Redis NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { AbstractNodeCode } from '../../node-code/abstract-node-code.js';
import { NodeCodeCategory } from '../../node-code/node-code.js';
import type { ConfigurationDescription } from '../../configuration/configuration-description.js';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';

/**
 * Pluggable key-value store interface.
 * Consumers provide implementations (Redis, etc.).
 */
export interface KeyValueStore {
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
}

/**
 * Writes a context value to a key-value store via pluggable KeyValueStore.
 */
export class WriteToRedisNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'key', name: 'Key', description: 'Key to store the value under (supports {context} interpolation)', type: 'string' },
        { key: 'source_context_path', name: 'Source Path', description: 'Context path containing the value to store', type: 'string' },
        { key: 'ttl', name: 'TTL', description: 'Time-to-live in seconds (optional)', type: 'int', isOptional: true },
    ];

    private store?: KeyValueStore;

    constructor(store?: KeyValueStore) {
        super('write_redis', 'Write to Key-Value Store', 'Writes context value to a key-value store', NodeCodeCategory.DATA);
        this.store = store;
    }

    setStore(store: KeyValueStore): void {
        this.store = store;
    }

    async process(context: Context): Promise<Result> {
        if (!this.store) {
            return this.result(ResultStatus.ERROR, 'No KeyValueStore configured');
        }

        let key = this.getRequiredConfigValue('key') as string;
        const sourcePath = this.getRequiredConfigValue('source_context_path') as string;
        const ttl = this.getOptionalConfigValue('ttl') as number | null;

        // Interpolate context values in key
        key = key.replace(/\{(\w+)\}/g, (_, k: string) => String(context.get(k) ?? ''));

        if (!context.has(sourcePath)) {
            return this.result(ResultStatus.ERROR, `No data at context path "${sourcePath}"`);
        }

        const value = context.get(sourcePath);
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);

        try {
            await this.store.set(key, serialized, ttl ?? undefined);
            return this.result(ResultStatus.OK, `Stored value at key "${key}"${ttl ? ` (TTL: ${ttl}s)` : ''}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `KV store write error: ${message}`);
        }
    }
}
