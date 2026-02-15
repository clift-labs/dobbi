// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Configuration Manager
// ─────────────────────────────────────────────────────────────────────────────

import type { ConfigurationValue } from './configuration-value.js';

export class ConfigurationManager {
    static readonly DELETE = '_DELETE_';
    private config: Map<string, ConfigurationValue> = new Map();

    merge(overrides: ConfigurationValue[]): void {
        for (const cv of overrides) {
            if (this.config.has(cv.key) && cv.value === ConfigurationManager.DELETE) {
                this.config.delete(cv.key);
            } else {
                this.config.set(cv.key, cv);
            }
        }
    }

    hasValue(key: string): boolean {
        const cv = this.config.get(key);
        return cv != null && cv.value != null;
    }

    hasDefault(key: string): boolean {
        const cv = this.config.get(key);
        return cv != null && cv.default != null;
    }

    getValue(key: string): unknown {
        const cv = this.config.get(key);
        if (!cv) return null;
        if (cv.value != null) return cv.value;
        return cv.default ?? null;
    }

    getUnmaskedValue(key: string): unknown {
        const cv = this.config.get(key);
        return cv?.value ?? cv?.default ?? null;
    }

    getAll(): Map<string, ConfigurationValue> {
        return new Map(this.config);
    }
}
