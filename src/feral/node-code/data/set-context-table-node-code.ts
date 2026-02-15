// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Set Context Table NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class SetContextTableNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'table', name: 'Table', description: 'A JSON object of key-value pairs to set in the context.', type: 'string' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'All values were set successfully.' },
    ];

    constructor() {
        super('set_context_table', 'Set Data Table', 'Sets multiple context values from a key-value map.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const tableRaw = this.getRequiredConfigValue('table');
        let table: Record<string, unknown>;

        if (typeof tableRaw === 'string') {
            table = JSON.parse(tableRaw) as Record<string, unknown>;
        } else {
            table = tableRaw as Record<string, unknown>;
        }

        let count = 0;
        for (const [key, value] of Object.entries(table)) {
            context.set(key, value);
            count++;
        }

        return this.result(ResultStatus.OK, `Set ${count} context value(s).`);
    }
}
