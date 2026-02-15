// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Catalog Node
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A NodeCode bound with partial configuration.
 * Lives in a Catalog. Bridges between reusable NodeCode logic
 * and process-specific ProcessNodes.
 */
export interface CatalogNode {
    readonly key: string;
    readonly nodeCodeKey: string;
    readonly name: string;
    readonly group: string;
    readonly description: string;
    readonly configuration: Record<string, unknown>;
}

export function createCatalogNode(props: {
    key: string;
    nodeCodeKey: string;
    name?: string;
    group?: string;
    description?: string;
    configuration?: Record<string, unknown>;
}): CatalogNode {
    return {
        key: props.key,
        nodeCodeKey: props.nodeCodeKey,
        name: props.name ?? '',
        group: props.group ?? 'Ungrouped',
        description: props.description ?? '',
        configuration: props.configuration ?? {},
    };
}
