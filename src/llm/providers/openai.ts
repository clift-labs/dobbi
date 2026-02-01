import OpenAI from 'openai';
import { getApiKey } from '../../config.js';
import type { LLMProvider, Message, ChatOptions } from '../types.js';

export class OpenAIProvider implements LLMProvider {
    name = 'openai';
    private client: OpenAI | null = null;
    private modelId: string;

    constructor(modelId: string = 'gpt-4o') {
        this.modelId = modelId;
    }

    private async getClient(): Promise<OpenAI> {
        if (this.client) {
            return this.client;
        }

        const apiKey = await getApiKey('openai');
        if (!apiKey) {
            throw new Error(
                "Dobbie needs an API key for OpenAI, sir. Please run 'dobbie config add-provider openai'"
            );
        }

        this.client = new OpenAI({ apiKey });
        return this.client;
    }

    async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
        const client = await this.getClient();

        // Convert messages to OpenAI format
        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        // Add system prompt if provided
        if (options.systemPrompt) {
            openaiMessages.push({
                role: 'system',
                content: options.systemPrompt,
            });
        }

        // Add other messages
        for (const msg of messages) {
            openaiMessages.push({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
            });
        }

        const response = await client.chat.completions.create({
            model: this.modelId,
            max_tokens: options.maxTokens || 4096,
            messages: openaiMessages,
        });

        return response.choices[0]?.message?.content || '';
    }
}

export function createOpenAIProvider(modelId?: string): LLMProvider {
    return new OpenAIProvider(modelId);
}
