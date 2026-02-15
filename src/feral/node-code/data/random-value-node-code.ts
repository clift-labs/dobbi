// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Random Value NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class RandomValueNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'context_path', name: 'Context Path', description: 'Context key to store the random value.', type: 'string' },
        { key: 'type', name: 'Type', description: 'Type of random value.', type: 'string', default: 'float', options: ['float', 'int', 'uuid'] },
        { key: 'min', name: 'Minimum', description: 'Minimum value (for int/float types).', type: 'float', default: 0, isOptional: true },
        { key: 'max', name: 'Maximum', description: 'Maximum value (for int/float types).', type: 'float', default: 1, isOptional: true },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Random value generated.' },
    ];

    constructor() {
        super('random_value', 'Random Value', 'Generates a random value and stores it in context.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const contextPath = this.getRequiredConfigValue('context_path') as string;
        const type = this.getRequiredConfigValue('type', 'float') as string;
        const min = Number(this.getOptionalConfigValue('min', 0));
        const max = Number(this.getOptionalConfigValue('max', 1));

        let value: unknown;
        switch (type) {
            case 'float':
                value = min + Math.random() * (max - min);
                break;
            case 'int':
                value = Math.floor(min + Math.random() * (max - min + 1));
                break;
            case 'uuid':
                value = crypto.randomUUID();
                break;
            default:
                throw new Error(`Unknown random type "${type}".`);
        }

        context.set(contextPath, value);
        return this.result(ResultStatus.OK, `Generated random ${type}: ${value}`);
    }
}
