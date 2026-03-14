// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Catalog Configuration (JSON file at {vault}/.dobbi/feral-catalog.json)
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import { getFeralCatalogPath, getVaultDobbiDir } from '../../paths.js';

/**
 * JSON shape for a single user-defined CatalogNode.
 */
export interface CatalogNodeConfigJson {
    key: string;
    node_code_key: string;
    name?: string;
    group?: string;
    description?: string;
    configuration?: Record<string, unknown>;
}

/**
 * JSON shape for the feral-catalog.json file.
 */
export interface FeralCatalogConfigJson {
    catalog_nodes: CatalogNodeConfigJson[];
}

const EMPTY_CONFIG: FeralCatalogConfigJson = { catalog_nodes: [] };

/**
 * Load the catalog config from disk. Returns empty config if the file doesn't exist.
 */
export async function loadFeralCatalogConfig(): Promise<FeralCatalogConfigJson> {
    try {
        const configPath = await getFeralCatalogPath();
        const data = await fs.readFile(configPath, 'utf-8');
        const parsed = JSON.parse(data) as FeralCatalogConfigJson;
        return {
            catalog_nodes: Array.isArray(parsed.catalog_nodes) ? parsed.catalog_nodes : [],
        };
    } catch {
        return { ...EMPTY_CONFIG };
    }
}

/**
 * Save the catalog config to disk.
 */
export async function saveFeralCatalogConfig(config: FeralCatalogConfigJson): Promise<void> {
    const dir = await getVaultDobbiDir();
    await fs.mkdir(dir, { recursive: true });
    const configPath = await getFeralCatalogPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
