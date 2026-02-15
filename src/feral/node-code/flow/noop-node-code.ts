// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Noop NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class NoopNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'No operation performed.' },
    ];

    constructor() {
        super('noop', 'No Operation', 'Does nothing, returns OK.', NodeCodeCategory.FLOW);
    }

    async process(_context: Context): Promise<Result> {
        return this.result(ResultStatus.OK, 'No operation.');
    }
}
