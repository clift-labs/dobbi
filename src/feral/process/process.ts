// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Process
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../context/context.js';
import type { ProcessNode } from './node.js';
import type { Edge } from './edge.js';

/**
 * The complete process definition: key, description, nodes, edges,
 * and initial context data.
 */
export interface Process {
    readonly key: string;
    readonly description: string;
    readonly context: Context;
    readonly nodes: ProcessNode[];
    readonly edges: Edge[];
}
