// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Catalog
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogNode } from './catalog-node.js';

/**
 * A source that provides CatalogNode instances.
 */
export interface CatalogSource {
    getCatalogNodes(): CatalogNode[];
}

/**
 * Registry of all available CatalogNodes, populated from CatalogSource providers.
 */
export class Catalog {
    private nodes: Map<string, CatalogNode> = new Map();

    constructor(sources: CatalogSource[] = []) {
        for (const source of sources) {
            for (const node of source.getCatalogNodes()) {
                if (node.key) this.nodes.set(node.key, node);
            }
        }
    }

    getCatalogNode(key: string): CatalogNode {
        const node = this.nodes.get(key);
        if (!node) throw new Error(`Catalog node "${key}" not found.`);
        return node;
    }

    getAllCatalogNodes(): CatalogNode[] {
        return Array.from(this.nodes.values());
    }
}
