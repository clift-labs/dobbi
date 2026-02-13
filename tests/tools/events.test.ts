import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

vi.mock('../../src/entities/entity.js', () => ({
    slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, '-')),
    createEntityMeta: vi.fn((_type: string, title: string, opts: any) => ({
        title,
        entityType: 'event',
        created: new Date().toISOString(),
        tags: opts?.tags || [],
        project: opts?.project || 'default',
    })),
    ensureEntityDir: vi.fn().mockResolvedValue('/tmp/test/events'),
    findEntityByTitle: vi.fn().mockResolvedValue(null),
    listEntities: vi.fn().mockResolvedValue([]),
    writeEntity: vi.fn().mockResolvedValue('/tmp/test/events/test.md'),
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

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    return {
        ...actual,
        promises: {
            ...actual.promises,
            readdir: vi.fn().mockResolvedValue([]),
            readFile: vi.fn().mockResolvedValue('---\ntitle: Test\n---\nContent'),
            writeFile: vi.fn().mockResolvedValue(undefined),
            mkdir: vi.fn().mockResolvedValue(undefined),
            stat: vi.fn().mockRejectedValue(new Error('ENOENT')),
        },
    };
});

vi.mock('gray-matter', () => ({
    default: vi.fn().mockReturnValue({ data: {}, content: 'content' }),
}));

import '../../src/tools/events.js';
import { getServiceTool } from '../../src/tools/types.js';

describe('events tools', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('events.add', () => {
        it('should be registered', () => {
            expect(getServiceTool('events.add')).toBeDefined();
        });

        it('should require startDate and endDate', () => {
            const tool = getServiceTool('events.add')!;
            expect(tool.inputSchema?.required).toContain('startDate');
            expect(tool.inputSchema?.required).toContain('endDate');
        });
    });

    describe('events.update', () => {
        it('should be registered', () => {
            expect(getServiceTool('events.update')).toBeDefined();
        });
    });

    describe('events.remove', () => {
        it('should be registered', () => {
            expect(getServiceTool('events.remove')).toBeDefined();
        });
    });

    describe('events.review', () => {
        it('should be registered', () => {
            expect(getServiceTool('events.review')).toBeDefined();
        });

        it('should be an AI tool', () => {
            const tool = getServiceTool('events.review')!;
            expect(tool.type).toBe('ai');
        });
    });

    describe('events.list', () => {
        it('should be registered', () => {
            expect(getServiceTool('events.list')).toBeDefined();
        });
    });
});
