// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — JSON Encode NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class JsonEncodeNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'source_context_path', name: 'Source Path', description: 'Context key containing the value to encode.', type: 'string' },
        { key: 'target_context_path', name: 'Target Path', description: 'Context key to store the JSON string.', type: 'string' },
        { key: 'pretty', name: 'Pretty Print', description: 'Indent the JSON output.', type: 'boolean', default: false, isOptional: true },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Value encoded to JSON successfully.' },
    ];

    constructor() {
        super('json_encode', 'JSON Encode', 'Encodes a context value to a JSON string.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const sourcePath = this.getRequiredConfigValue('source_context_path') as string;
        const targetPath = this.getRequiredConfigValue('target_context_path') as string;
        const pretty = this.getOptionalConfigValue('pretty', false);

        const value = context.get(sourcePath);
        const indent = pretty ? 2 : undefined;
        const jsonString = JSON.stringify(value, null, indent);

        context.set(targetPath, jsonString);
        return this.result(ResultStatus.OK, `Encoded "${sourcePath}" → JSON in "${targetPath}".`);
    }
}
