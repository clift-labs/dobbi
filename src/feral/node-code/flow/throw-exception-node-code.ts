// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Throw Exception NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ProcessError } from '../../errors.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class ThrowExceptionNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'message', name: 'Message', description: 'The error message to throw.', type: 'string', default: 'Intentional exception from ThrowExceptionNodeCode.' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [];

    constructor() {
        super('throw_exception', 'Throw Exception', 'Throws an exception (for testing).', NodeCodeCategory.FLOW);
    }

    async process(_context: Context): Promise<Result> {
        const message = this.getRequiredConfigValue('message', 'Intentional exception from ThrowExceptionNodeCode.') as string;
        throw new ProcessError(message);
    }
}
