import type { Tool } from './types.js';
import { registerTool } from './types.js';
import { getModelForCapability, createDobbieSystemPrompt } from '../llm/router.js';

export const summarizeTool: Tool = {
    name: 'summarize',
    description: 'Summarizes text using AI',
    type: 'ai',
    capability: 'summarize',

    async execute(input: string, context: string[] = []): Promise<string> {
        const llm = await getModelForCapability('summarize');
        const contextString = context.join('\n\n---\n\n');
        const systemPrompt = createDobbieSystemPrompt(contextString);

        const response = await llm.chat(
            [{ role: 'user', content: `Please summarize the following text concisely:\n\n${input}` }],
            { systemPrompt }
        );

        return response;
    },
};

// Register the tool
registerTool(summarizeTool);

export default summarizeTool;
