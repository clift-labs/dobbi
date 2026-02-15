// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Configuration Value
// ─────────────────────────────────────────────────────────────────────────────

export enum ConfigurationValueType {
    STANDARD = 'STANDARD',
    SECRET = 'SECRET',
    OPTIONAL = 'OPTIONAL',
    OPTIONAL_SECRET = 'OPTIONAL_SECRET',
}

export interface ConfigurationValue {
    key: string;
    type: ConfigurationValueType;
    value?: unknown;
    default?: unknown;
}

export function isSecret(cv: ConfigurationValue): boolean {
    return cv.type === ConfigurationValueType.SECRET || cv.type === ConfigurationValueType.OPTIONAL_SECRET;
}

export function resolveValue(cv: ConfigurationValue): unknown {
    if (cv.value != null) return isSecret(cv) ? '*********' : cv.value;
    return cv.default ?? null;
}

export function resolveUnmaskedValue(cv: ConfigurationValue): unknown {
    return cv.value ?? cv.default ?? null;
}
