// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Runner
// ─────────────────────────────────────────────────────────────────────────────

import { DefaultContext } from '../context/context.js';
import type { Context } from '../context/context.js';
import type { ProcessFactory } from '../process/process-factory.js';
import type { ProcessEngine } from '../engine/process-engine.js';

/**
 * High-level API to run a process by key with initial context values.
 */
export class Runner {
    constructor(
        private processFactory: ProcessFactory,
        private engine: ProcessEngine,
    ) { }

    async run(processKey: string, contextValues: Record<string, unknown> = {}): Promise<Context> {
        const context = new DefaultContext();
        for (const [k, v] of Object.entries(contextValues)) {
            context.set(k, v);
        }

        const process = this.processFactory.build(processKey);
        await this.engine.process(process, context);
        return context;
    }
}
