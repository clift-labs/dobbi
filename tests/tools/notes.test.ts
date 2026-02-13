import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

// Mock entity module
vi.mock('../../src/entities/entity.js', () => ({
    slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
    createEntityMeta: vi.fn((_type: string, title: string, opts: any) => ({
        title,
        entityType: 'note',
        created: new Date().toISOString(),
        tags: opts?.tags || [],
        project: opts?.project || 'default',
    })),
    ensureEntityDir: vi.fn().mockResolvedValue('/tmp/test/notes'),
    findEntityByTitle: vi.fn().mockResolvedValue(null),
    listEntities: vi.fn().mockResolvedValue([]),
    writeEntity: vi.fn().mockResolvedValue('/tmp/test/notes/test.md'),
}));

vi.mock('../../src/state/manager.js', () => ({
    getActiveProject: vi.fn().mockResolvedValue('test-project'),
    getVaultRoot: vi.fn().mockResolvedValue('/tmp/test-vault'),
    setActiveProject: vi.fn(),
    listProjects: vi.fn().mockResolvedValue(['test-project']),
    createProject: vi.fn(),
    projectExists: vi.fn().mockResolvedValue(false),
}));

// Import AFTER mocks are set up
import '../../src/tools/notes.js';
import { getServiceTool } from '../../src/tools/types.js';
import { findEntityByTitle, listEntities, writeEntity } from '../../src/entities/entity.js';

describe('notes tools', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('notes.add', () => {
        it('should be registered', () => {
            expect(getServiceTool('notes.add')).toBeDefined();
        });

        it('should create a note', async () => {
            const tool = getServiceTool('notes.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'My Note', content: 'Hello' }, ctx);

            expect(result.success).toBe(true);
            expect(writeEntity).toHaveBeenCalled();
        });

        it('should reject duplicate titles', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce({
                filepath: '/tmp/test/notes/my-note.md',
                meta: { title: 'My Note' },
                content: 'existing',
            });

            const tool = getServiceTool('notes.add')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'My Note' }, ctx);

            expect(result.success).toBe(false);
            expect(result.error).toContain('exists');
        });
    });

    describe('notes.update', () => {
        it('should be registered', () => {
            expect(getServiceTool('notes.update')).toBeDefined();
        });

        it('should fail when note not found', async () => {
            vi.mocked(findEntityByTitle).mockResolvedValueOnce(null);

            const tool = getServiceTool('notes.update')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ title: 'Missing Note', appendContent: 'extra' }, ctx);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });
    });

    describe('notes.remove', () => {
        it('should be registered', () => {
            expect(getServiceTool('notes.remove')).toBeDefined();
        });
    });

    describe('notes.list', () => {
        it('should be registered', () => {
            expect(getServiceTool('notes.list')).toBeDefined();
        });

        it('should return list of notes', async () => {
            vi.mocked(listEntities).mockResolvedValueOnce([
                { filepath: '/a.md', meta: { title: 'Note A', entityType: 'note', created: '', tags: [], project: 'p' }, content: 'c' },
            ]);

            const tool = getServiceTool('notes.list')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({}, ctx);

            expect(result.success).toBe(true);
        });
    });

    describe('notes.review', () => {
        it('should be registered', () => {
            expect(getServiceTool('notes.review')).toBeDefined();
        });

        it('should require AI capability', () => {
            const tool = getServiceTool('notes.review')!;
            expect(tool.type).toBe('ai');
        });
    });

    describe('notes.get', () => {
        it('should be registered', () => {
            expect(getServiceTool('notes.get')).toBeDefined();
        });
    });
});
