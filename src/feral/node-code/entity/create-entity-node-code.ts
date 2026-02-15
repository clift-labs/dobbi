// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Create Entity NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import path from 'path';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';
import {
    slugify,
    createEntityMeta,
    ensureEntityDir,
    findEntityByTitle,
    writeEntity,
    type EntityTypeName,
} from '../../../entities/entity.js';
import { getActiveProject } from '../../../state/manager.js';

/**
 * Custom result for duplicate detection.
 */
const ALREADY_EXISTS = 'already_exists';

export class CreateEntityNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'entity_type', name: 'Entity Type', description: 'The entity type to create (task, note, event, research, goal).', type: 'string' },
        { key: 'extra_fields', name: 'Extra Fields', description: 'Comma-separated list of extra context keys to include in metadata (e.g. status,priority,dueDate).', type: 'string', default: '', isOptional: true },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Entity created successfully.' },
        { status: ALREADY_EXISTS, description: 'Entity with this title already exists.' },
        { status: ResultStatus.ERROR, description: 'Failed to create entity.' },
    ];

    constructor() {
        super('create_entity', 'Create Entity', 'Creates a new entity in the active project.', NodeCodeCategory.DATA);
    }

    async process(context: Context): Promise<Result> {
        const entityType = this.getRequiredConfigValue('entity_type') as EntityTypeName;
        const extraFieldsStr = this.getOptionalConfigValue('extra_fields', '') as string;

        const title = context.get('title') as string;
        if (!title) {
            context.set('error', 'No title provided in context.');
            return this.result(ResultStatus.ERROR, 'Missing title in context.');
        }

        const project = await getActiveProject();
        if (!project) {
            context.set('error', 'No active project.');
            return this.result(ResultStatus.ERROR, 'No active project.');
        }

        // Check for duplicates
        const existing = await findEntityByTitle(entityType, title);
        if (existing) {
            context.set('error', `${entityType} "${title}" already exists.`);
            return this.result(ALREADY_EXISTS, `${entityType} "${title}" already exists.`);
        }

        const content = (context.get('content') as string) ?? '';
        const tags = (context.get('tags') as string[]) ?? [];

        const dir = await ensureEntityDir(entityType);
        const slug = slugify(title);
        const filepath = path.join(dir, `${slug}.md`);

        const meta: Record<string, unknown> = {
            ...createEntityMeta(entityType, title, { tags, project }),
        };

        // Merge extra fields from context into metadata
        if (extraFieldsStr) {
            for (const field of extraFieldsStr.split(',').map(f => f.trim()).filter(Boolean)) {
                const val = context.get(field);
                if (val !== undefined) {
                    meta[field] = val;
                }
            }
        }

        await writeEntity(filepath, meta, content);

        context.set('filepath', filepath);
        context.set('entity', { filepath, content, ...meta });

        return this.result(ResultStatus.OK, `Created ${entityType} "${title}" at ${filepath}.`);
    }
}
