// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Data Synthesis Prep NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { AbstractNodeCode } from '../../node-code/abstract-node-code.js';
import { NodeCodeCategory } from '../../node-code/node-code.js';
import type { ConfigurationDescription } from '../../configuration/configuration-description.js';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';

/**
 * Prepares structured data for LLM synthesis.
 * Reads context values, formats them as a structured summary,
 * and stores the result for subsequent LLM prompt injection.
 */
export class DataSynthesisPrepNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'source_context_paths', name: 'Source Paths', description: 'Comma-separated context paths to collect', type: 'string' },
        { key: 'output_context_path', name: 'Output Path', description: 'Context path for the prepared data', type: 'string', isOptional: true, default: 'synthesis_data' },
        { key: 'format', name: 'Format', description: 'Output format: "json" or "text"', type: 'string', isOptional: true, default: 'text' },
    ];

    constructor() {
        super('synthesis_prep', 'Data Synthesis Prep', 'Prepares structured data for LLM synthesis', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const paths = (this.getRequiredConfigValue('source_context_paths') as string).split(',').map(p => p.trim());
        const outputPath = this.getOptionalConfigValue('output_context_path', 'synthesis_data') as string;
        const format = this.getOptionalConfigValue('format', 'text') as string;

        const data: Record<string, unknown> = {};
        for (const path of paths) {
            if (context.has(path)) {
                data[path] = context.get(path);
            }
        }

        if (format === 'json') {
            context.set(outputPath, JSON.stringify(data, null, 2));
        } else {
            const lines = Object.entries(data).map(([key, value]) => {
                const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                return `${key}: ${valueStr}`;
            });
            context.set(outputPath, lines.join('\n'));
        }

        return this.result(ResultStatus.OK, `Prepared ${Object.keys(data).length} items for synthesis`);
    }
}
