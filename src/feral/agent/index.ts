// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Public API
// ─────────────────────────────────────────────────────────────────────────────

// Model Schema
export type { ModelPropertySchema, ModelSchema } from './model-schema.js';
export { ModelSchemaRegistry } from './model-schema.js';

// Brain
export type { AgentBrain, AgentThought } from './agent-brain.js';
export { ChatGptBrain } from './chatgpt-brain.js';

// Agent
export { AgentResult } from './agent.js';
export type { Agent, AgentOutcome, AgentResultValue } from './agent.js';

// Agents
export { ProcessAgent } from './process-agent.js';
export { ProtoFlowAgent } from './protoflow-agent.js';

// Utilities
export { RenderPrompt } from './render-prompt.js';
