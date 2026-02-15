// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Counter NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class CounterNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'context_path', name: 'Context Path', description: 'Context key for the counter value.', type: 'string' },
        { key: 'direction', name: 'Direction', description: 'Increment or decrement.', type: 'string', default: 'increment', options: ['increment', 'decrement'] },
        { key: 'step', name: 'Step', description: 'Amount to increment/decrement by.', type: 'int', default: 1, isOptional: true },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Counter updated successfully.' },
    ];

    constructor() {
        super('counter', 'Counter', 'Increments or decrements a context value.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const contextPath = this.getRequiredConfigValue('context_path') as string;
        const direction = this.getRequiredConfigValue('direction', 'increment') as string;
        const step = Number(this.getOptionalConfigValue('step', 1));

        const current = context.has(contextPath) ? context.getInt(contextPath) : 0;
        const newValue = direction === 'decrement' ? current - step : current + step;

        context.set(contextPath, newValue);
        return this.result(ResultStatus.OK, `Counter "${contextPath}": ${current} → ${newValue}`);
    }
}
