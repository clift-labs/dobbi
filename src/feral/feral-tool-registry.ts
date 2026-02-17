// ─────────────────────────────────────────────────────────────────────────────
// Feral Tool Registry
//
// Auto-generates ServiceTool objects from Feral processes that include
// a `tool` metadata block in their JSON definition.  This eliminates
// the need for hand-written registerServiceTool() wrappers for every
// CRUD operation.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProcessFactory } from './process/process-factory.js';
import type { Runner } from './runner/runner.js';
import type { ServiceTool, ServiceToolResult } from '../tools/types.js';
import type { Canvas } from '../service/protocol.js';

/**
 * Scans all Feral processes for `tool` metadata and produces ServiceTool
 * objects with a generic execute() that delegates to runner.run().
 */
export class FeralToolRegistry {
    private tools: Map<string, ServiceTool> = new Map();

    constructor(
        private processFactory: ProcessFactory,
        private runner: Runner,
    ) {
        this.buildTools();
    }

    // ── Public API ──────────────────────────────────────────────────────

    getTool(name: string): ServiceTool | undefined {
        return this.tools.get(name);
    }

    hasTool(name: string): boolean {
        return this.tools.has(name);
    }

    listTools(): ServiceTool[] {
        return Array.from(this.tools.values());
    }

    // ── Internals ───────────────────────────────────────────────────────

    private buildTools(): void {
        const processes = this.processFactory.getAllProcesses();

        for (const process of processes) {
            if (!process.tool) continue; // skip processes without tool metadata

            const meta = process.tool;
            const runner = this.runner;
            const processKey = process.key;

            const tool: ServiceTool = {
                name: processKey,
                description: process.description || processKey,
                type: meta.type,
                ...(meta.capability && { capability: meta.capability as 'summarize' | 'reason' | 'categorize' }),
                ...(meta.input_schema && { inputSchema: meta.input_schema }),

                execute: async (input, context): Promise<ServiceToolResult> => {
                    context.log.info(`Running Feral process: ${processKey}`);

                    const inputRecord = (input ?? {}) as Record<string, unknown>;
                    const ctx = await runner.run(processKey, inputRecord);

                    const output = ctx.get('output');
                    const error = ctx.get('error');

                    if (error) {
                        return { success: false, output: null, error: String(error) };
                    }

                    const result: ServiceToolResult = {
                        success: true,
                        output: output ?? inputRecord,
                    };

                    // Apply canvas update if the process declares a canvas_type
                    if (meta.canvas_type) {
                        const title = inputRecord.title as string || '';
                        const content = inputRecord.content as string || '';
                        result.canvasUpdate = {
                            type: meta.canvas_type as Canvas['type'],
                            title,
                            content,
                            dirty: false,
                        };
                    }

                    return result;
                },
            };

            this.tools.set(processKey, tool);
        }
    }
}
