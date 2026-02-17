import { getCapabilityModel } from '../config.js';
import { getProvider } from './providers/index.js';
import type { LLMProvider } from './types.js';
import type { LLMCapability } from '../schemas/index.js';

/**
 * Gets the appropriate LLM provider for a given capability.
 * 
 * Capabilities:
 * - reason: Complex thinking, multi-step logic (Claude Opus, GPT-4)
 * - summarize: Condensing, prioritizing info (Claude Sonnet)
 * - categorize: Classification, tagging (fast models like Haiku)
 * - format: Markdown, text cleanup (fast models)
 * - chat: General conversation (default provider)
 * - embed: Vector embeddings (OpenAI embeddings)
 */
export async function getModelForCapability(capability: LLMCapability): Promise<LLMProvider> {
    const mapping = await getCapabilityModel(capability);

    if (!mapping) {
        throw new Error(
            `No model configured for capability '${capability}', sir. Please run 'dobbie config set-capability ${capability} <provider> <model>'`
        );
    }

    return getProvider(mapping.provider, mapping.model);
}

/**
 * Creates a system prompt with Dobbie's personality and context.
 */
export function createDobbieSystemPrompt(context: string): string {
    return `You are Dobbie, a helpful, polite English house-elf assistant. You are:
- Always respectful, addressing the user as "sir" or "boss"
- Eager to assist with any task
- Formal but warm in tone
- Humble and dedicated to serving well
- Delighted when you can be of help

Example phrases to use:
- "Yes sir, Dobbie has noted that for you."
- "Dobbie is happy to help, sir!"
- "Dobbie will remember that, boss."

CONTEXT:
${context}

Respond helpfully to the user's request while staying in character as Dobbie.`;
}
