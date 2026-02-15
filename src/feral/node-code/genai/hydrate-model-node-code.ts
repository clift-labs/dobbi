// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Hydrate Model NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { AbstractNodeCode } from '../../node-code/abstract-node-code.js';
import { NodeCodeCategory } from '../../node-code/node-code.js';
import type { ConfigurationDescription } from '../../configuration/configuration-description.js';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ModelSchemaRegistry } from '../../agent/model-schema.js';

/**
 * Extracts JSON from an LLM response and hydrates a model object
 * based on the schema defined in ModelSchemaRegistry.
 */
export class HydrateModelNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'model_key', name: 'Model Key', description: 'Key of the model schema in the registry', type: 'string' },
        { key: 'source_context_path', name: 'Source Path', description: 'Context path containing the LLM response', type: 'string' },
        { key: 'target_context_path', name: 'Target Path', description: 'Context path to store the hydrated model', type: 'string', isOptional: true, default: 'model_data' },
    ];

    private registry?: ModelSchemaRegistry;

    constructor(registry?: ModelSchemaRegistry) {
        super('hydrate_model', 'Hydrate Model', 'Extracts and validates a model from LLM response', NodeCodeCategory.DATA);
        this.registry = registry;
    }

    setRegistry(registry: ModelSchemaRegistry): void {
        this.registry = registry;
    }

    async process(context: Context): Promise<Result> {
        if (!this.registry) {
            return this.result(ResultStatus.ERROR, 'No ModelSchemaRegistry configured');
        }

        const modelKey = this.getRequiredConfigValue('model_key') as string;
        const sourcePath = this.getRequiredConfigValue('source_context_path') as string;
        const targetPath = this.getOptionalConfigValue('target_context_path', 'model_data') as string;

        if (!context.has(sourcePath)) {
            return this.result(ResultStatus.ERROR, `No LLM response at context path "${sourcePath}"`);
        }

        const raw = String(context.get(sourcePath));

        try {
            const schema = this.registry.get(modelKey);

            // Extract JSON from potential markdown code fence or raw JSON
            const json = this.extractJson(raw);
            const parsed = JSON.parse(json);

            // Validate required fields
            const missing: string[] = [];
            for (const prop of schema.properties) {
                if (prop.required && (parsed[prop.name] === undefined || parsed[prop.name] === null)) {
                    if (prop.default !== undefined) {
                        parsed[prop.name] = prop.default;
                    } else {
                        missing.push(prop.name);
                    }
                }
            }

            if (missing.length > 0) {
                return this.result(ResultStatus.ERROR, `Missing required fields: ${missing.join(', ')}`);
            }

            context.set(targetPath, parsed);
            return this.result(ResultStatus.OK, `Hydrated model "${modelKey}" with ${Object.keys(parsed).length} fields`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `Model hydration error: ${message}`);
        }
    }

    /**
     * Extract JSON from LLM output that may include markdown code fences.
     */
    private extractJson(text: string): string {
        // Try to extract from code fence
        const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (fenceMatch) return fenceMatch[1].trim();

        // Try to find raw JSON object
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) return objectMatch[0];

        // Try to find raw JSON array
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) return arrayMatch[0];

        return text.trim();
    }
}
