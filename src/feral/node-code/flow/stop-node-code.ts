// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Stop NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class StopNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.STOP, description: 'The process has been stopped.' },
    ];

    constructor() {
        super('stop', 'Stop Process', 'The node that stops a process.', NodeCodeCategory.FLOW);
    }

    async process(_context: Context): Promise<Result> {
        return this.result(ResultStatus.STOP, 'Stop processing.');
    }
}
