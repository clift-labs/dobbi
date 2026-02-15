// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Model Schema & Registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes a single property on a model for GenAI hydration.
 */
export interface ModelPropertySchema {
    readonly name: string;
    readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    readonly description: string;
    readonly required: boolean;
    readonly default?: unknown;
    readonly items?: ModelPropertySchema; // for array types
}

/**
 * Describes a model's schema for GenAI prompt generation and response hydration.
 * Replaces PHP Reflection + Attributes with an explicit registry.
 */
export interface ModelSchema {
    readonly key: string;
    readonly name: string;
    readonly description: string;
    readonly properties: ModelPropertySchema[];
}

/**
 * Registry for model schemas used by GenAI NodeCodes.
 * Models are registered at bootstrap time and referenced by key.
 */
export class ModelSchemaRegistry {
    private schemas: Map<string, ModelSchema> = new Map();

    register(schema: ModelSchema): void {
        this.schemas.set(schema.key, schema);
    }

    get(key: string): ModelSchema {
        const schema = this.schemas.get(key);
        if (!schema) {
            throw new Error(`Model schema "${key}" not found in registry.`);
        }
        return schema;
    }

    has(key: string): boolean {
        return this.schemas.has(key);
    }

    getAll(): ModelSchema[] {
        return Array.from(this.schemas.values());
    }

    /**
     * Generate a JSON Schema-like prompt description for a model.
     */
    toPromptText(key: string): string {
        const schema = this.get(key);
        const props = schema.properties.map(p => {
            const req = p.required ? ' (required)' : ' (optional)';
            return `  - ${p.name}: ${p.type}${req} — ${p.description}`;
        });
        return [
            `Model: ${schema.name}`,
            `Description: ${schema.description}`,
            `Properties:`,
            ...props,
        ].join('\n');
    }
}
