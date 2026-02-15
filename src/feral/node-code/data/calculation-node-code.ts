// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Calculation NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

export class CalculationNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'left_context_path', name: 'Left Operand Path', description: 'Context key for the left operand.', type: 'string' },
        { key: 'right_context_path', name: 'Right Operand Path', description: 'Context key for the right operand.', type: 'string', isOptional: true },
        { key: 'right_value', name: 'Right Value', description: 'Literal value for the right operand.', type: 'string', isOptional: true },
        { key: 'operation', name: 'Operation', description: 'Math operation to perform.', type: 'string', options: ['add', 'subtract', 'multiply', 'divide', 'modulo'] },
        { key: 'result_context_path', name: 'Result Path', description: 'Context key to store the result.', type: 'string' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Calculation completed successfully.' },
        { status: ResultStatus.ERROR, description: 'Division by zero or invalid operands.' },
    ];

    constructor() {
        super('calculation', 'Calculation', 'Performs math operations on context values.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const leftPath = this.getRequiredConfigValue('left_context_path') as string;
        const operation = this.getRequiredConfigValue('operation') as string;
        const resultPath = this.getRequiredConfigValue('result_context_path') as string;

        const left = Number(context.get(leftPath));

        let right: number;
        const rightPath = this.getOptionalConfigValue('right_context_path') as string | null;
        if (rightPath) {
            right = Number(context.get(rightPath));
        } else {
            right = Number(this.getRequiredConfigValue('right_value'));
        }

        if (isNaN(left) || isNaN(right)) {
            return this.result(ResultStatus.ERROR, `Invalid operands: left=${left}, right=${right}`);
        }

        let result: number;
        switch (operation) {
            case 'add': result = left + right; break;
            case 'subtract': result = left - right; break;
            case 'multiply': result = left * right; break;
            case 'divide':
                if (right === 0) return this.result(ResultStatus.ERROR, 'Division by zero.');
                result = left / right;
                break;
            case 'modulo':
                if (right === 0) return this.result(ResultStatus.ERROR, 'Modulo by zero.');
                result = left % right;
                break;
            default: throw new Error(`Unknown operation "${operation}".`);
        }

        context.set(resultPath, result);
        return this.result(ResultStatus.OK, `${left} ${operation} ${right} = ${result}`);
    }
}
