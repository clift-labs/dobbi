// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Process Node
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A CatalogNode placed in a specific process,
 * with optional additional configuration overrides.
 */
export interface ProcessNode {
    /** Unique key within the process */
    readonly key: string;
    readonly description: string;
    /** References a CatalogNode by key */
    readonly catalogNodeKey: string;
    /** Process-level configuration overrides */
    readonly configuration: Record<string, unknown>;
}
