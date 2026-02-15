// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Configuration Description
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Declares what configuration keys a NodeCode accepts.
 * Replaces PHP #[Attribute] decorators — NodeCode classes declare these
 * via a static `configDescriptions` property.
 */
export interface ConfigurationDescription {
    key: string;
    name: string;
    description: string;
    type: 'string' | 'int' | 'float' | 'boolean' | 'string_array' | 'int_array' | 'float_array';
    default?: unknown;
    isSecret?: boolean;
    isOptional?: boolean;
    options?: string[];         // enumerated valid values
}

/**
 * Declares what result statuses a NodeCode can return.
 * Used for documentation / LLM prompting (FeralMagic).
 */
export interface ResultDescription {
    status: string;
    description: string;
}
