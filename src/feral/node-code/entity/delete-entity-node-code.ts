// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Delete Entity NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';
import { findEntityByTitle, type EntityTypeName } from '../../../entities/entity.js';

const NOT_FOUND = 'not_found';

export class DeleteEntityNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'entity_type', name: 'Entity Type', description: 'The entity type to delete (task, note, event, research, goal).', type: 'string' },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Entity deleted successfully.' },
        { status: NOT_FOUND, description: 'Entity not found.' },
    ];

    constructor() {
        super('delete_entity', 'Delete Entity', 'Deletes an entity by title.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const entityType = this.getRequiredConfigValue('entity_type') as EntityTypeName;

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

        await fs.unlink(found.filepath);

        context.set('deleted', {
            filepath: found.filepath,
            title: found.meta.title,
            deleted: true,
        });

        return this.result(ResultStatus.OK, `Deleted ${entityType} "${title}".`);
    }
}
