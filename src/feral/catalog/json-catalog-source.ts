// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — JSON Catalog Source
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogNode } from './catalog-node.js';
import { createCatalogNode } from './catalog-node.js';
import type { CatalogSource } from './catalog.js';
import type { FeralCatalogConfigJson } from './feral-catalog-config.js';

/**
 * Creates CatalogNodes from user-defined JSON configuration.
 * These are preconfigured specializations — e.g. an "http" NodeCode
 * wrapped as "fetch_user_api" with a preset URL and method.
 */
export class JsonCatalogSource implements CatalogSource {
    constructor(private config: FeralCatalogConfigJson) { }

    getCatalogNodes(): CatalogNode[] {
        return this.config.catalog_nodes.map(entry =>
            createCatalogNode({
                key: entry.key,
                nodeCodeKey: entry.node_code_key,
                name: entry.name,
                group: entry.group,
                description: entry.description,
                configuration: entry.configuration,
            }),
        );
    }
}
