// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Update Entity NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';
import { findEntityByTitle, writeEntity, type EntityTypeName } from '../../../entities/entity.js';

const NOT_FOUND = 'not_found';

export class UpdateEntityNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'entity_type', name: 'Entity Type', description: 'The entity type to update (task, note, event, research, goal).', type: 'string' },
        { key: 'patch_fields', name: 'Patch Fields', description: 'Comma-separated context keys to merge into entity metadata (e.g. status,priority,dueDate).', type: 'string', default: '', isOptional: true },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Entity updated successfully.' },
        { status: NOT_FOUND, description: 'Entity not found.' },
    ];

    constructor() {
        super('update_entity', 'Update Entity', 'Updates an existing entity by title.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const entityType = this.getRequiredConfigValue('entity_type') as EntityTypeName;
        const patchFieldsStr = this.getOptionalConfigValue('patch_fields', '') as string;

        const title = context.get('title') as string;
        if (!title) {
            context.set('error', 'No title provided in context.');
            return this.result(NOT_FOUND, 'Missing title in context.');
        }

        const found = await findEntityByTitle(entityType, title);
        if (!found) {
            context.set('error', `${entityType} "${title}" not found.`);
            return this.result(NOT_FOUND, `${entityType} "${title}" not found.`);
        }

        // Merge content if provided
        const newContent = context.get('content') as string | undefined;
        const content = newContent !== undefined ? newContent : found.content;

        // Merge patch fields from context into existing metadata
        if (patchFieldsStr) {
            for (const field of patchFieldsStr.split(',').map(f => f.trim()).filter(Boolean)) {
                const val = context.get(field);
                if (val !== undefined) {
                    found.meta[field] = val;
                }
            }
        }

        // Merge tags if provided
        const tags = context.get('tags') as string[] | undefined;
        if (tags) found.meta.tags = tags;

        await writeEntity(found.filepath, found.meta, content);

        context.set('entity', {
            filepath: found.filepath,
            content,
            ...found.meta,
        });

        return this.result(ResultStatus.OK, `Updated ${entityType} "${title}".`);
    }
}
