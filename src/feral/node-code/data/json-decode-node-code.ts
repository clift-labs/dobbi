// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — JSON Decode NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class JsonDecodeNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'source_context_path', name: 'Source Path', description: 'Context key containing the JSON string.', type: 'string' },
        { key: 'target_context_path', name: 'Target Path', description: 'Context key to store the parsed object.', type: 'string' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'JSON decoded successfully.' },
        { status: ResultStatus.ERROR, description: 'Invalid JSON string.' },
    ];

    constructor() {
        super('json_decode', 'JSON Decode', 'Decodes a JSON string from context into an object.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const sourcePath = this.getRequiredConfigValue('source_context_path') as string;
        const targetPath = this.getRequiredConfigValue('target_context_path') as string;
        const jsonString = context.getString(sourcePath);

        try {
            const parsed = JSON.parse(jsonString);
            context.set(targetPath, parsed);
            return this.result(ResultStatus.OK, `Decoded JSON from "${sourcePath}" → "${targetPath}".`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `Failed to decode JSON from "${sourcePath}": ${message}`);
        }
    }
}
