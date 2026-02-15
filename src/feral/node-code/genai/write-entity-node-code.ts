// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Write Entity NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { AbstractNodeCode } from '../../node-code/abstract-node-code.js';
import { NodeCodeCategory } from '../../node-code/node-code.js';
import type { ConfigurationDescription } from '../../configuration/configuration-description.js';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';

/**
 * Pluggable entity persister interface.
 * Consumers must provide an implementation.
 */
export interface EntityPersister {
    persist(entityType: string, data: Record<string, unknown>): Promise<string | number>;
}

/**
 * Persists an entity from context using a pluggable EntityPersister.
 */
export class WriteEntityNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'entity_type', name: 'Entity Type', description: 'Type/table name of the entity', type: 'string' },
        { key: 'source_context_path', name: 'Source Path', description: 'Context path containing the entity data', type: 'string' },
        { key: 'id_context_path', name: 'ID Path', description: 'Context path to store the persisted entity ID', type: 'string', isOptional: true, default: 'entity_id' },
    ];

    private persister?: EntityPersister;

    constructor(persister?: EntityPersister) {
        super('write_entity', 'Write Entity', 'Persists an entity via pluggable EntityPersister', NodeCodeCategory.DATA);
        this.persister = persister;
    }

    setPersister(persister: EntityPersister): void {
        this.persister = persister;
    }

    async process(context: Context): Promise<Result> {
        if (!this.persister) {
            return this.result(ResultStatus.ERROR, 'No EntityPersister configured');
        }

        const entityType = this.getRequiredConfigValue('entity_type') as string;
        const sourcePath = this.getRequiredConfigValue('source_context_path') as string;
        const idPath = this.getOptionalConfigValue('id_context_path', 'entity_id') as string;

        if (!context.has(sourcePath)) {
            return this.result(ResultStatus.ERROR, `No entity data at context path "${sourcePath}"`);
        }

        const data = context.get(sourcePath) as Record<string, unknown>;

        try {
            const id = await this.persister.persist(entityType, data);
            context.set(idPath, id);
            return this.result(ResultStatus.OK, `Persisted ${entityType} with ID ${id}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `Entity persist error: ${message}`);
        }
    }
}
