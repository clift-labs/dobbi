// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Built-In Catalog Source
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogNode } from './catalog-node.js';
import { createCatalogNode } from './catalog-node.js';
import type { CatalogSource } from './catalog.js';
import type { NodeCodeFactory } from '../node-code/node-code-factory.js';

/**
 * Automatically creates a 1:1 CatalogNode for every registered NodeCode.
 * This ensures all built-in node codes are available in the catalog
 * without requiring any configuration.
 */
export class BuiltInCatalogSource implements CatalogSource {
    constructor(private nodeCodeFactory: NodeCodeFactory) { }

    getCatalogNodes(): CatalogNode[] {
        return this.nodeCodeFactory.getAllNodeCodes().map(nc =>
            createCatalogNode({
                key: nc.key,
                nodeCodeKey: nc.key,
                name: nc.name,
                group: nc.categoryKey,
                description: nc.description,
            }),
        );
    }
}
