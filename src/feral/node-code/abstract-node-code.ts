// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Abstract NodeCode Base Class
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../context/context.js';
import type { ConfigurationValue } from '../configuration/configuration-value.js';
import { ConfigurationManager } from '../configuration/configuration-manager.js';
import type { Result } from '../result/result.js';
import { createResult, type ResultStatusValue } from '../result/result.js';
import { MissingConfigurationValueError } from '../errors.js';
import type { NodeCode, NodeCodeCategoryValue } from './node-code.js';

/**
 * Base class for all NodeCode implementations.
 * Replaces PHP traits (NodeCodeMetaTrait, ResultsTrait, ConfigurationTrait, etc.)
 */
export abstract class AbstractNodeCode implements NodeCode {
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly categoryKey: NodeCodeCategoryValue;
    protected configManager: ConfigurationManager;

    constructor(key: string, name: string, description: string, categoryKey: NodeCodeCategoryValue) {
        this.key = key;
        this.name = name;
        this.description = description;
        this.categoryKey = categoryKey;
        this.configManager = new ConfigurationManager();
    }

    addConfiguration(values: ConfigurationValue[]): void {
        this.configManager.merge(values);
    }

    /** Helper: create a Result */
    protected result(status: ResultStatusValue, message = ''): Result {
        return createResult(status, message);
    }

    /** Helper: get a required config value, throw if missing */
    protected getRequiredConfigValue(key: string, fallback?: unknown): unknown {
        const val = this.configManager.getValue(key);
        if (val != null) return val;
        if (fallback !== undefined) return fallback;
        throw new MissingConfigurationValueError(key);
    }

    /** Helper: get an optional config value */
    protected getOptionalConfigValue(key: string, fallback?: unknown): unknown {
        return this.configManager.getValue(key) ?? fallback ?? null;
    }

    abstract process(context: Context): Promise<Result>;
}
