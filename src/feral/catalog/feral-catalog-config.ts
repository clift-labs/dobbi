// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Catalog Configuration (JSON file at ~/.dobbie/feral-catalog.json)
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const DOBBIE_DIR = path.join(os.homedir(), '.dobbie');
const FERAL_CATALOG_PATH = path.join(DOBBIE_DIR, 'feral-catalog.json');

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
        const data = await fs.readFile(FERAL_CATALOG_PATH, 'utf-8');
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
    await fs.mkdir(DOBBIE_DIR, { recursive: true });
    await fs.writeFile(FERAL_CATALOG_PATH, JSON.stringify(config, null, 2));
}

export { FERAL_CATALOG_PATH };
