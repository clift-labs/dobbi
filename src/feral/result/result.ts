// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Result
// ─────────────────────────────────────────────────────────────────────────────

/** Well-known result status constants used as edge selectors */
export const ResultStatus = {
    OK: 'ok',
    SKIP: 'skip',
    STOP: 'stop',
    WARNING: 'warning',
    ERROR: 'error',
    TRUE: 'true',
    FALSE: 'false',
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    TERTIARY: 'tertiary',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    GREATER_THAN: 'gt',
    GREATER_THAN_EQUAL: 'gte',
    LESS_THAN: 'lt',
    LESS_THAN_EQUAL: 'lte',
} as const;

export type ResultStatusValue = (typeof ResultStatus)[keyof typeof ResultStatus] | string;

export interface Result {
    /** The status string used for edge routing */
    readonly status: ResultStatusValue;
    /** Human-readable message for logging */
    readonly message: string;
}

/** Factory helper */
export function createResult(status: ResultStatusValue, message = ''): Result {
    return { status, message };
}
