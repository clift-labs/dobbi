// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Entity Catalog Source
// ─────────────────────────────────────────────────────────────────────────────
//
// Pre-configured CatalogNodes for entity CRUD operations across all entity types.
// Each entity type gets: list, find, create, update, delete, and sort nodes.
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogNode } from './catalog-node.js';

interface EntityConfig {
    type: string;
    plural: string;
    createFields?: string;
    updateFields?: string;
    sortBy?: string;
}

const ENTITY_CONFIGS: EntityConfig[] = [
    { type: 'task', plural: 'tasks', createFields: 'status,priority,dueDate', updateFields: 'status,priority,dueDate', sortBy: 'priority,dueDate' },
    { type: 'note', plural: 'notes' },
    { type: 'event', plural: 'events', createFields: 'startDate,endDate,location,recurring', updateFields: 'startDate,endDate,location,recurring' },
    { type: 'research', plural: 'research', createFields: 'status,sources', updateFields: 'status,sources,appendContent' },
    { type: 'goal', plural: 'goals', createFields: 'status,priority,smart,milestones', updateFields: 'status,priority,smart,milestones,addMilestone', sortBy: 'priority,status' },
];

/**
 * Provides CatalogNodes for all entity-type CRUD operations.
 */
export class EntityCatalogSource {
    getCatalogNodes(): CatalogNode[] {
        const nodes: CatalogNode[] = [];

        for (const cfg of ENTITY_CONFIGS) {
            const { type, plural, createFields, updateFields, sortBy } = cfg;

            nodes.push({
                key: `list_${plural}`,
                nodeCodeKey: 'list_entities',
                name: `List ${capitalize(plural)}`,
                group: 'entity',
                description: `Lists all ${plural} in the active project.`,
                configuration: { entity_type: type, context_path: 'entities' },
            });

            nodes.push({
                key: `find_${type}`,
                nodeCodeKey: 'find_entity',
                name: `Find ${capitalize(type)}`,
                group: 'entity',
                description: `Finds a ${type} by title.`,
                configuration: { entity_type: type, title_context_key: 'title', context_path: 'entity' },
            });

            nodes.push({
                key: `create_${type}`,
                nodeCodeKey: 'create_entity',
                name: `Create ${capitalize(type)}`,
                group: 'entity',
                description: `Creates a new ${type}.`,
                configuration: createFields
                    ? { entity_type: type, extra_fields: createFields }
                    : { entity_type: type },
            });

            nodes.push({
                key: `update_${type}`,
                nodeCodeKey: 'update_entity',
                name: `Update ${capitalize(type)}`,
                group: 'entity',
                description: `Updates an existing ${type}.`,
                configuration: updateFields
                    ? { entity_type: type, patch_fields: updateFields }
                    : { entity_type: type },
            });

            nodes.push({
                key: `delete_${type}`,
                nodeCodeKey: 'delete_entity',
                name: `Delete ${capitalize(type)}`,
                group: 'entity',
                description: `Deletes a ${type} by title.`,
                configuration: { entity_type: type },
            });

            nodes.push({
                key: `sort_${plural}`,
                nodeCodeKey: 'sort_entities',
                name: `Sort ${capitalize(plural)}`,
                group: 'entity',
                description: `Sorts a ${plural} array by configurable fields.`,
                configuration: sortBy
                    ? { context_path: 'entities', sort_by: sortBy }
                    : { context_path: 'entities' },
            });
        }

        return nodes;
    }
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
