// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Find Entity NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';
import { findEntityByTitle, type EntityTypeName } from '../../../entities/entity.js';

/**
 * Custom result status for "not found" branching.
 */
const NOT_FOUND = 'not_found';

export class FindEntityNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'entity_type', name: 'Entity Type', description: 'The entity type to search (task, note, event, research, goal).', type: 'string' },
        { key: 'title_context_key', name: 'Title Context Key', description: 'Context key holding the title/filename to search for.', type: 'string', default: 'title' },
        { key: 'context_path', name: 'Context Path', description: 'Context key to store the found entity.', type: 'string', default: 'entity' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Entity found.' },
        { status: NOT_FOUND, description: 'Entity not found.' },
    ];

    constructor() {
        super('find_entity', 'Find Entity', 'Finds an entity by title or filename.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const entityType = this.getRequiredConfigValue('entity_type') as EntityTypeName;
        const titleKey = this.getRequiredConfigValue('title_context_key', 'title') as string;
        const contextPath = this.getRequiredConfigValue('context_path', 'entity') as string;

        const title = context.get(titleKey) as string;
        if (!title) {
            context.set('error', `No title found in context at "${titleKey}".`);
            return this.result(NOT_FOUND, `No title provided at context key "${titleKey}".`);
        }

        const found = await findEntityByTitle(entityType, title);
        if (!found) {
            context.set('error', `${entityType} "${title}" not found.`);
            return this.result(NOT_FOUND, `${entityType} "${title}" not found.`);
        }

        context.set(contextPath, {
            filepath: found.filepath,
            content: found.content,
            ...found.meta,
        });

        return this.result(ResultStatus.OK, `Found ${entityType} "${title}".`);
    }
}
