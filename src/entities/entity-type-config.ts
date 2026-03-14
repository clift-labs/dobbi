// ─────────────────────────────────────────────────────────────────────────────
// ENTITY TYPE CONFIG
// Loads entity type definitions from {vault}/.dobbi/entity-types.json.
// Falls back to built-in defaults if the file doesn't exist.
// Users can add, modify, or extend entity types by editing the JSON file.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import { DEFAULT_ENTITY_TYPES, BUILT_IN_TYPE_NAMES } from './entity-types-defaults.js';
import { debug } from '../utils/debug.js';
import { getEntityTypesPath, getVaultDobbiDir } from '../paths.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum' | 'array' | 'object';

export interface FieldDef {
    key: string;
    type: FieldType;
    label?: string;
    required?: boolean;
    default?: unknown;
    values?: string[];          // for enum fields
}

/** Maps a field from the template entity to the spawned child entity */
export interface FieldMapping {
    from?: string;              // field key on template entity (copy value from)
    to?: string;                // field key on child entity (write value to)
    target?: string;            // alias for 'to' (alternative syntax)
    value?: string;             // literal value or '{date}' / '{title}' token
    default?: unknown;          // fallback if 'from' field is absent
}

export interface DateSeriesScheduling {
    cadenceField: string;           // field holding 'daily'|'weekly'|'monthly'
    cadenceDetailsField: string;    // field holding CadenceDetails object
    blackoutField: string;          // field holding BlackoutWindow[]
}

export interface SpawnerConfig {
    mode: 'date-series' | 'template';
    targetTypeField?: string;       // field on template that names the target entity type
    titlePattern?: string;          // e.g. "{title} — {YYYY-MM-DD}"
    dedupeFields?: string[];        // fields used to detect already-spawned entities
    scheduling?: DateSeriesScheduling;
    fieldMapping?: FieldMapping[];
    childrenField?: string;         // for template mode: field holding child specs array
}

export interface EntityTypeConfig {
    name: string;
    plural: string;
    directory: string;          // subdirectory name within the project
    description?: string;
    defaultTags?: string[];
    fields: FieldDef[];
    completionField?: string;   // e.g. 'status'
    completionValue?: string;   // e.g. 'done'
    spawner?: SpawnerConfig;    // present only on entities that spawn children
}

interface EntityTypesFile {
    version: number;
    entityTypes: EntityTypeConfig[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE
// ─────────────────────────────────────────────────────────────────────────────

let _cache: EntityTypeConfig[] | null = null;

function invalidateCache(): void {
    _cache = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOAD / SAVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load entity type configs. Returns vault file contents if present,
 * otherwise falls back to built-in defaults.
 */
export async function loadEntityTypes(): Promise<EntityTypeConfig[]> {
    if (_cache) return _cache;

    try {
        const typesPath = await getEntityTypesPath();
        const raw = await fs.readFile(typesPath, 'utf-8');
        const parsed: EntityTypesFile = JSON.parse(raw);
        if (!Array.isArray(parsed.entityTypes)) {
            throw new Error('entity-types.json missing entityTypes array');
        }
        _cache = parsed.entityTypes;
        return _cache;
    } catch (err) {
        debug('entity-types', `Using built-in defaults: ${err}`);
        _cache = DEFAULT_ENTITY_TYPES;
        return _cache;
    }
}

/**
 * Save entity type configs to the vault file.
 */
export async function saveEntityTypes(types: EntityTypeConfig[]): Promise<void> {
    const dir = await getVaultDobbiDir();
    await fs.mkdir(dir, { recursive: true });
    const typesPath = await getEntityTypesPath();
    const file: EntityTypesFile = { version: 1, entityTypes: types };
    await fs.writeFile(typesPath, JSON.stringify(file, null, 2));
    invalidateCache();
}

/**
 * Write entity-types.json with built-in defaults if it doesn't already exist.
 * Called by `dobbi init`.
 */
export async function initEntityTypes(): Promise<void> {
    try {
        const typesPath = await getEntityTypesPath();
        await fs.access(typesPath);
        debug('entity-types', 'entity-types.json already exists — skipping init');
    } catch {
        await saveEntityTypes(DEFAULT_ENTITY_TYPES);
        const typesPath = await getEntityTypesPath();
        debug('entity-types', `Created ${typesPath}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the config for a specific entity type by name.
 */
export async function getEntityType(name: string): Promise<EntityTypeConfig | null> {
    const types = await loadEntityTypes();
    return types.find(t => t.name === name) ?? null;
}

/**
 * List all registered entity type names.
 */
export async function listEntityTypeNames(): Promise<string[]> {
    const types = await loadEntityTypes();
    return types.map(t => t.name);
}

/**
 * Get all entity types that have a spawner config.
 */
export async function getSpawnerTypes(): Promise<EntityTypeConfig[]> {
    const types = await loadEntityTypes();
    return types.filter(t => t.spawner !== undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a new entity type. Throws if name already exists.
 */
export async function addEntityType(config: EntityTypeConfig): Promise<void> {
    const types = await loadEntityTypes();
    if (types.find(t => t.name === config.name)) {
        throw new Error(`Entity type "${config.name}" already exists.`);
    }
    types.push(config);
    await saveEntityTypes(types);
}

/**
 * Replace an entity type by name. Throws if not found.
 */
export async function updateEntityType(name: string, config: EntityTypeConfig): Promise<void> {
    const types = await loadEntityTypes();
    const idx = types.findIndex(t => t.name === name);
    if (idx === -1) throw new Error(`Entity type "${name}" not found.`);
    types[idx] = config;
    await saveEntityTypes(types);
}

/**
 * Remove an entity type by name. Throws if not found or is built-in.
 */
export async function removeEntityType(name: string): Promise<void> {
    if (BUILT_IN_TYPE_NAMES.has(name)) {
        throw new Error(`"${name}" is a built-in type and cannot be removed.`);
    }
    const types = await loadEntityTypes();
    const filtered = types.filter(t => t.name !== name);
    if (filtered.length === types.length) throw new Error(`Entity type "${name}" not found.`);
    await saveEntityTypes(filtered);
}

export { BUILT_IN_TYPE_NAMES };
