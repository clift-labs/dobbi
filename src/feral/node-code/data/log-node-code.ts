// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Log NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class LogNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'message', name: 'Message', description: 'Log message template. Use {context_key} for interpolation.', type: 'string' },
        { key: 'level', name: 'Level', description: 'Log level.', type: 'string', default: 'info', options: ['debug', 'info', 'warn', 'error'], isOptional: true },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Message was logged.' },
    ];

    /** Override this to redirect output (useful for testing) */
    logger: (level: string, message: string) => void = (level, message) => {
        switch (level) {
            case 'debug': console.debug(`[feral] ${message}`); break;
            case 'warn': console.warn(`[feral] ${message}`); break;
            case 'error': console.error(`[feral] ${message}`); break;
            default: console.log(`[feral] ${message}`);
        }
    };

    constructor() {
        super('log', 'Log Message', 'Logs a message with template interpolation from context values.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const template = this.getRequiredConfigValue('message') as string;
        const level = this.getOptionalConfigValue('level', 'info') as string;

        // Interpolate {key} references with context values
        const message = template.replace(/\{(\w+)\}/g, (_, key: string) => {
            return String(context.get(key) ?? '');
        });

        this.logger(level, message);
        return this.result(ResultStatus.OK, message);
    }
}
