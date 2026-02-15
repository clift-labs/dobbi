// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Model to Output NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { AbstractNodeCode } from '../../node-code/abstract-node-code.js';
import { NodeCodeCategory } from '../../node-code/node-code.js';
import type { ConfigurationDescription } from '../../configuration/configuration-description.js';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ModelSchemaRegistry } from '../../agent/model-schema.js';

/**
 * Generates a text description of a model schema for LLM consumption.
 * The output is suitable for inclusion in a prompt that asks the LLM
 * to produce structured data matching the schema.
 */
export class ModelToOutputNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'model_key', name: 'Model Key', description: 'Key of the model schema in the registry', type: 'string' },
        { key: 'output_context_path', name: 'Output Path', description: 'Context path for the prompt text', type: 'string', isOptional: true, default: 'model_prompt' },
    ];

    private registry?: ModelSchemaRegistry;

    constructor(registry?: ModelSchemaRegistry) {
        super('model_to_output', 'Model to Output', 'Generates LLM prompt from model schema', NodeCodeCategory.DATA);
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
        const outputPath = this.getOptionalConfigValue('output_context_path', 'model_prompt') as string;

        try {
            const promptText = this.registry.toPromptText(modelKey);
            const fullPrompt = [
                'You must respond with a JSON object that matches the following model schema:',
                '',
                promptText,
                '',
                'Respond ONLY with valid JSON, no other text.',
            ].join('\n');

            context.set(outputPath, fullPrompt);
            return this.result(ResultStatus.OK, `Generated prompt for model "${modelKey}"`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `Model prompt error: ${message}`);
        }
    }
}
