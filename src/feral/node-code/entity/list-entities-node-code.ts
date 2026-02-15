// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — List Entities NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';
import { listEntities, type EntityTypeName } from '../../../entities/entity.js';

export class ListEntitiesNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'entity_type', name: 'Entity Type', description: 'The entity type to list (task, note, event, research, goal).', type: 'string' },
        { key: 'context_path', name: 'Context Path', description: 'Context key to store the entity list.', type: 'string', default: 'entities' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Entities listed successfully.' },
        { status: ResultStatus.ERROR, description: 'Failed to list entities.' },
    ];

    constructor() {
        super('list_entities', 'List Entities', 'Lists all entities of a given type in the active project.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const entityType = this.getRequiredConfigValue('entity_type') as EntityTypeName;
        const contextPath = this.getRequiredConfigValue('context_path', 'entities') as string;

        try {
            const entities = await listEntities(entityType);
            const result = entities.map(e => ({
                title: e.meta.title as string,
                filepath: e.filepath,
                content: e.content,
                ...e.meta,
            }));

            context.set(contextPath, result);
            return this.result(ResultStatus.OK, `Listed ${result.length} ${entityType}(s).`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            context.set('error', message);
            return this.result(ResultStatus.ERROR, `Failed to list ${entityType}: ${message}`);
        }
    }
}
