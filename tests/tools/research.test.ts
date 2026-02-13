import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

vi.mock('../../src/entities/entity.js', () => ({
    slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
    createEntityMeta: vi.fn((_type: string, title: string, opts: any) => ({
        title,
        entityType: 'research',
        created: new Date().toISOString(),
        tags: opts?.tags || [],
        project: opts?.project || 'default',
    })),
    ensureEntityDir: vi.fn().mockResolvedValue('/tmp/test/research'),
    findEntityByTitle: vi.fn().mockResolvedValue(null),
    listEntities: vi.fn().mockResolvedValue([]),
    writeEntity: vi.fn().mockResolvedValue('/tmp/test/research/test.md'),
    readEntity: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/state/manager.js', () => ({
    getActiveProject: vi.fn().mockResolvedValue('test-project'),
    getVaultRoot: vi.fn().mockResolvedValue('/tmp/test-vault'),
    setActiveProject: vi.fn(),
    listProjects: vi.fn().mockResolvedValue(['test-project']),
    createProject: vi.fn(),
    projectExists: vi.fn().mockResolvedValue(false),
}));

import '../../src/tools/research.js';
import { getServiceTool } from '../../src/tools/types.js';
import { findEntityByTitle, listEntities, writeEntity } from '../../src/entities/entity.js';

describe('research tools', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('research.add', () => {
        it('should be registered', () => {
            expect(getServiceTool('research.add')).toBeDefined();
        });

        it('should create a research document', async () => {
            const tool = getServiceTool('research.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'AI Safety', content: 'Research into...' }, ctx);

            expect(result.success).toBe(true);
            expect(writeEntity).toHaveBeenCalled();
        });

        it('should reject duplicate titles', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce({
                filepath: '/tmp/test/research/ai-safety.md',
                meta: { title: 'AI Safety' },
                content: 'existing',
            });

            const tool = getServiceTool('research.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'AI Safety' }, ctx);

            expect(result.success).toBe(false);
        });
    });

    describe('research.update', () => {
        it('should be registered', () => {
            expect(getServiceTool('research.update')).toBeDefined();
        });

        it('should fail when research not found', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce(null);

            const tool = getServiceTool('research.update')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Missing', appendContent: 'extra' }, ctx);

            expect(result.success).toBe(false);
        });
    });

    describe('research.remove', () => {
        it('should be registered', () => {
            expect(getServiceTool('research.remove')).toBeDefined();
        });
    });

    describe('research.review', () => {
        it('should be registered', () => {
            expect(getServiceTool('research.review')).toBeDefined();
        });

        it('should be an AI tool', () => {
            const tool = getServiceTool('research.review')!;
            expect(tool.type).toBe('ai');
        });
    });

    describe('research.list', () => {
        it('should be registered', () => {
            expect(getServiceTool('research.list')).toBeDefined();
        });

        it('should return list of research', async () => {
            vi.mocked(listEntities).mockResolvedValueOnce([
                { filepath: '/a.md', meta: { title: 'Research A', entityType: 'research', created: '', tags: [], project: 'p' }, content: 'c' },
            ]);

            const tool = getServiceTool('research.list')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({}, ctx);

            expect(result.success).toBe(true);
        });
    });
});
