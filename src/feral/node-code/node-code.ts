// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — NodeCode Interface
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../context/context.js';
import type { ConfigurationValue } from '../configuration/configuration-value.js';
import type { Result } from '../result/result.js';

export const NodeCodeCategory = {
    FLOW: 'flow',
    DATA: 'data',
    WORK: 'work',
} as const;

export type NodeCodeCategoryValue = (typeof NodeCodeCategory)[keyof typeof NodeCodeCategory] | string;

export interface NodeCode {
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly categoryKey: NodeCodeCategoryValue;

    /** Merge configuration values into this node code */
    addConfiguration(values: ConfigurationValue[]): void;

    /** Execute the node logic against the context */
    process(context: Context): Promise<Result>;
}
