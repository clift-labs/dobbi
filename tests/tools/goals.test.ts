import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

vi.mock('../../src/entities/entity.js', () => ({
    slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
    createEntityMeta: vi.fn((_type: string, title: string, opts: any) => ({
        title,
        entityType: 'goal',
        created: new Date().toISOString(),
        tags: opts?.tags || [],
        project: opts?.project || 'default',
    })),
    ensureEntityDir: vi.fn().mockResolvedValue('/tmp/test/goals'),
    findEntityByTitle: vi.fn().mockResolvedValue(null),
    listEntities: vi.fn().mockResolvedValue([]),
    writeEntity: vi.fn().mockResolvedValue('/tmp/test/goals/test.md'),
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

import '../../src/tools/goals.js';
import { getServiceTool } from '../../src/tools/types.js';
import { findEntityByTitle, listEntities, writeEntity } from '../../src/entities/entity.js';

describe('goals tools', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('goals.add', () => {
        it('should be registered', () => {
            expect(getServiceTool('goals.add')).toBeDefined();
        });

        it('should create a goal', async () => {
            const tool = getServiceTool('goals.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Learn Rust', description: 'Master Rust' }, ctx);

            expect(result.success).toBe(true);
            expect(writeEntity).toHaveBeenCalled();
        });

        it('should reject duplicate titles', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce({
                filepath: '/tmp/test/goals/learn-rust.md',
                meta: { title: 'Learn Rust' },
                content: 'existing',
            });

            const tool = getServiceTool('goals.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Learn Rust' }, ctx);

            expect(result.success).toBe(false);
        });
    });

    describe('goals.update', () => {
        it('should be registered', () => {
            expect(getServiceTool('goals.update')).toBeDefined();
        });

        it('should fail when goal not found', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce(null);

            const tool = getServiceTool('goals.update')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Missing Goal' }, ctx);

            expect(result.success).toBe(false);
        });
    });

    describe('goals.remove', () => {
        it('should be registered', () => {
            expect(getServiceTool('goals.remove')).toBeDefined();
        });
    });

    describe('goals.review', () => {
        it('should be registered', () => {
            expect(getServiceTool('goals.review')).toBeDefined();
        });

        it('should be an AI tool', () => {
            const tool = getServiceTool('goals.review')!;
            expect(tool.type).toBe('ai');
        });
    });

    describe('goals.list', () => {
        it('should be registered', () => {
            expect(getServiceTool('goals.list')).toBeDefined();
        });

        it('should return list of goals', async () => {
            vi.mocked(listEntities).mockResolvedValueOnce([
                { filepath: '/a.md', meta: { title: 'Goal A', entityType: 'goal', created: '', tags: [], project: 'p' }, content: 'c' },
            ]);

            const tool = getServiceTool('goals.list')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({}, ctx);

            expect(result.success).toBe(true);
        });
    });

    describe('goals.get', () => {
        it('should be registered', () => {
            expect(getServiceTool('goals.get')).toBeDefined();
        });
    });
});
