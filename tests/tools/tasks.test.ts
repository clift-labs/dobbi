import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

vi.mock('../../src/entities/entity.js', () => ({
    slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
    createEntityMeta: vi.fn((_type: string, title: string, opts: any) => ({
        title,
        entityType: 'task',
        created: new Date().toISOString(),
        tags: opts?.tags || [],
        project: opts?.project || 'default',
    })),
    ensureEntityDir: vi.fn().mockResolvedValue('/tmp/test/todos'),
    findEntityByTitle: vi.fn().mockResolvedValue(null),
    listEntities: vi.fn().mockResolvedValue([]),
    writeEntity: vi.fn().mockResolvedValue('/tmp/test/todos/test.md'),
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

import '../../src/tools/tasks.js';
import { getServiceTool } from '../../src/tools/types.js';
import { findEntityByTitle, listEntities, writeEntity } from '../../src/entities/entity.js';

describe('tasks tools', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('tasks.add', () => {
        it('should be registered', () => {
            expect(getServiceTool('tasks.add')).toBeDefined();
        });

        it('should create a task', async () => {
            const tool = getServiceTool('tasks.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Fix bug', priority: 'high' }, ctx);

            expect(result.success).toBe(true);
            expect(writeEntity).toHaveBeenCalled();
        });

        it('should reject duplicate titles', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce({
                filepath: '/tmp/test/todos/fix-bug.md',
                meta: { title: 'Fix bug' },
                content: 'existing',
            });

            const tool = getServiceTool('tasks.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Fix bug' }, ctx);

            expect(result.success).toBe(false);
        });
    });

    describe('tasks.update', () => {
        it('should be registered', () => {
            expect(getServiceTool('tasks.update')).toBeDefined();
        });

        it('should fail when task not found', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce(null);

            const tool = getServiceTool('tasks.update')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Missing Task' }, ctx);

            expect(result.success).toBe(false);
        });
    });

    describe('tasks.remove', () => {
        it('should be registered', () => {
            expect(getServiceTool('tasks.remove')).toBeDefined();
        });
    });

    describe('tasks.review', () => {
        it('should be registered', () => {
            expect(getServiceTool('tasks.review')).toBeDefined();
        });

        it('should be an AI tool', () => {
            const tool = getServiceTool('tasks.review')!;
            expect(tool.type).toBe('ai');
        });
    });

    describe('tasks.list', () => {
        it('should be registered', () => {
            expect(getServiceTool('tasks.list')).toBeDefined();
        });

        it('should return list of tasks', async () => {
            vi.mocked(listEntities).mockResolvedValueOnce([
                { filepath: '/a.md', meta: { title: 'Task A', entityType: 'task', created: '', tags: [], project: 'p', status: 'open', priority: 'medium' }, content: 'c' },
            ]);

            const tool = getServiceTool('tasks.list')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({}, ctx);

            expect(result.success).toBe(true);
        });
    });
});
