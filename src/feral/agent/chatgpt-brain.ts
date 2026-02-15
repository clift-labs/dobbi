// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — ChatGPT Brain
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentBrain, AgentThought } from './agent-brain.js';

/**
 * OpenAI SDK-based implementation of AgentBrain.
 * Uses chat completions with structured output instructions.
 */
export class ChatGptBrain implements AgentBrain {
    private apiKey: string;
    private model: string;
    private baseUrl?: string;

    constructor(apiKey: string, model = 'gpt-4o', baseUrl?: string) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    async think(prompt: string): Promise<AgentThought> {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
            apiKey: this.apiKey,
            ...(this.baseUrl ? { baseURL: this.baseUrl } : {}),
        });

        const systemPrompt = [
            'You are an AI agent brain. Given a prompt, decide what action to take.',
            'You must respond with valid JSON in this format:',
            '{',
            '  "action": "name_of_action",',
            '  "parameters": { ... },',
            '  "reasoning": "why you chose this action",',
            '  "done": false',
            '}',
            '',
            'Set "done" to true when the task is complete.',
            'Respond ONLY with the JSON, no other text.',
        ].join('\n');

        const completion = await client.chat.completions.create({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';

        try {
            const parsed = JSON.parse(this.extractJson(raw));
            return {
                action: parsed.action ?? 'unknown',
                parameters: parsed.parameters ?? {},
                reasoning: parsed.reasoning ?? '',
                done: parsed.done ?? false,
            };
        } catch {
            return {
                action: 'error',
                parameters: { raw },
                reasoning: 'Failed to parse brain response as JSON',
                done: true,
            };
        }
    }

    private extractJson(text: string): string {
        const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (fenceMatch) return fenceMatch[1].trim();
        const objectMatch = text.match(/\{[\s\S]*\}/);
        if (objectMatch) return objectMatch[0];
        return text.trim();
    }
}
