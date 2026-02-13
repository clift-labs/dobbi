import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

// Import the tool module to register it
import '../../src/tools/time.js';
import { getServiceTool } from '../../src/tools/types.js';

describe('time tool', () => {
    it('should be registered', () => {
        const tool = getServiceTool('time');
        expect(tool).toBeDefined();
        expect(tool?.type).toBe('deterministic');
    });

    it('should return current time string', async () => {
        const tool = getServiceTool('time')!;
        const ctx = createMockExecutionContext();
        const result = await tool.execute({}, ctx);

        expect(result.success).toBe(true);
        expect(typeof result.output).toBe('string');
        expect(result.output as string).toContain('current time');
    });

    it('should log the current time', async () => {
        const tool = getServiceTool('time')!;
        const ctx = createMockExecutionContext();
        await tool.execute({}, ctx);

        expect(ctx.log.info).toHaveBeenCalledWith(expect.stringContaining('Current time'));
    });
});
