import { z } from 'zod';

// Frontmatter schema for markdown files
export const FrontmatterSchema = z.object({
    title: z.string(),
    created: z.string(),
    modified: z.string().optional(),
    project: z.string().optional(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['active', 'done', 'blocked', 'archived']).optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

// Provider secrets
export const ProviderSecretSchema = z.object({
    apiKey: z.string(),
});

export const SecretsSchema = z.object({
    providers: z.record(z.string(), ProviderSecretSchema),
});

export type Secrets = z.infer<typeof SecretsSchema>;

// LLM Capability categories
export const LLMCapabilitySchema = z.enum([
    'reason',      // Complex thinking, multi-step logic
    'summarize',   // Condensing, prioritizing info
    'categorize',  // Classification, tagging
    'format',      // Markdown, text cleanup
    'chat',        // General conversation
    'embed',       // Vector embeddings
]);

export type LLMCapability = z.infer<typeof LLMCapabilitySchema>;

export const LLM_CAPABILITIES = LLMCapabilitySchema.options;

// Capability-to-model mapping
export const CapabilityModelMappingSchema = z.object({
    provider: z.string(),
    model: z.string(),
});

export type CapabilityModelMapping = z.infer<typeof CapabilityModelMappingSchema>;

// Config
export const ConfigSchema = z.object({
    capabilityMapping: z.record(LLMCapabilitySchema, CapabilityModelMappingSchema),
    defaultProvider: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;

// State
export const StateSchema = z.object({
    activeProject: z.string().nullable(),
    lastUsed: z.string().optional(),
});

export type State = z.infer<typeof StateSchema>;

// Tool types
export const ToolTypeSchema = z.enum(['deterministic', 'ai']);

export const ToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    type: ToolTypeSchema,
    capability: LLMCapabilitySchema.optional(),  // Which capability this tool uses
});

export type ToolDefinition = z.infer<typeof ToolSchema>;

// Standard tags
export const StandardTags = [
    'todo',
    'note',
    'research',
    'meeting',
    'idea',
    'blocked',
    'done',
    'context',
] as const;

export type StandardTag = typeof StandardTags[number];
