import { describe, it, expect, vi } from 'vitest';
import { createMockExecutionContext, createMockLLM } from '../helpers.js';

// Import the tool module to register it
import '../../src/tools/summarize.js';
import { getServiceTool } from '../../src/tools/types.js';

describe('summarize tool', () => {
    it('should be registered', () => {
        const tool = getServiceTool('summarize');
        expect(tool).toBeDefined();
        expect(tool?.type).toBe('ai');
    });

    it('should have inputSchema requiring text', () => {
        const tool = getServiceTool('summarize')!;
        expect(tool.inputSchema?.required).toContain('text');
        expect(tool.inputSchema?.properties?.text.type).toBe('string');
    });

    it('should call LLM with the text to summarize', async () => {
        const tool = getServiceTool('summarize')!;
        const mockLLM = createMockLLM('This is a summary');
        const ctx = createMockExecutionContext({ llm: mockLLM });

        const result = await tool.execute({ text: 'A long article about AI...' }, ctx);

        expect(result.success).toBe(true);
        expect(result.output).toBe('This is a summary');
        expect(mockLLM.chat).toHaveBeenCalledOnce();

        // Verify the prompt includes the text
        const callArgs = (mockLLM.chat as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const userMessage = callArgs.find((m: { role: string }) => m.role === 'user');
        expect(userMessage.content).toContain('A long article about AI...');
    });

    it('should log that it is summarizing', async () => {
        const tool = getServiceTool('summarize')!;
        const ctx = createMockExecutionContext();
        await tool.execute({ text: 'test' }, ctx);

        expect(ctx.log.info).toHaveBeenCalledWith(expect.stringContaining('Summarizing'));
    });
});
