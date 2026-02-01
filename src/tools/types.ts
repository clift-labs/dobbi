import type { LLMCapability } from '../schemas/index.js';

export interface Tool {
    name: string;
    description: string;
    type: 'deterministic' | 'ai';
    capability?: LLMCapability;  // Which capability to use (if type === 'ai')
    execute(input: string, context?: string[]): Promise<string>;
}

const tools: Map<string, Tool> = new Map();

export function registerTool(tool: Tool): void {
    tools.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
    return tools.get(name);
}

export function listTools(): Tool[] {
    return Array.from(tools.values());
}

export function hasTool(name: string): boolean {
    return tools.has(name);
}
