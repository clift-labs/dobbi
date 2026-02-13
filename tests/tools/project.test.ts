import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockExecutionContext } from '../helpers.js';

vi.mock('../../src/state/manager.js', () => ({
    getActiveProject: vi.fn().mockResolvedValue('test-project'),
    getVaultRoot: vi.fn().mockResolvedValue('/tmp/test-vault'),
    setActiveProject: vi.fn(),
    listProjects: vi.fn().mockResolvedValue(['test-project', 'other-project']),
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
            readFile: vi.fn().mockResolvedValue('{}'),
            writeFile: vi.fn().mockResolvedValue(undefined),
            mkdir: vi.fn().mockResolvedValue(undefined),
        },
    };
});

import '../../src/tools/project.js';
import { getServiceTool } from '../../src/tools/types.js';
import { projectExists, createProject, setActiveProject, listProjects, getActiveProject } from '../../src/state/manager.js';

describe('project tools', () => {
    beforeEach(() => vi.clearAllMocks());

    describe('project.create', () => {
        it('should be registered', () => {
            expect(getServiceTool('project.create')).toBeDefined();
        });

        it('should create a project and switch to it by default', async () => {
            const tool = getServiceTool('project.create')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ name: 'new-project' }, ctx);

            expect(result.success).toBe(true);
            expect(createProject).toHaveBeenCalledWith('new-project');
            expect(setActiveProject).toHaveBeenCalledWith('new-project');
        });

        it('should reject if project already exists', async () => {
            vi.mocked(projectExists).mockResolvedValueOnce(true);

            const tool = getServiceTool('project.create')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ name: 'existing' }, ctx);

            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists');
        });

        it('should set tokensToSet when switching', async () => {
            const tool = getServiceTool('project.create')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ name: 'myproj', switchTo: true }, ctx);

            expect(result.tokensToSet).toEqual({ project_name: 'myproj' });
        });
    });

    describe('project.use', () => {
        it('should be registered', () => {
            expect(getServiceTool('project.use')).toBeDefined();
        });

        it('should fail when project does not exist', async () => {
            vi.mocked(projectExists).mockResolvedValueOnce(false);

            const tool = getServiceTool('project.use')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ name: 'ghost' }, ctx);

            expect(result.success).toBe(false);
            expect(result.error).toContain('does not exist');
        });

        it('should switch to existing project', async () => {
            vi.mocked(projectExists).mockResolvedValueOnce(true);

            const tool = getServiceTool('project.use')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({ name: 'real-project' }, ctx);

            expect(result.success).toBe(true);
            expect(setActiveProject).toHaveBeenCalledWith('real-project');
            expect(result.tokensToSet).toEqual({ project_name: 'real-project' });
        });
    });

    describe('project.list', () => {
        it('should be registered', () => {
            expect(getServiceTool('project.list')).toBeDefined();
        });

        it('should return list of projects', async () => {
            const tool = getServiceTool('project.list')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({}, ctx);

            expect(result.success).toBe(true);
            expect((result.output as any).projects).toEqual(['test-project', 'other-project']);
        });
    });

    describe('project.current', () => {
        it('should be registered', () => {
            expect(getServiceTool('project.current')).toBeDefined();
        });

        it('should return the active project', async () => {
            const tool = getServiceTool('project.current')!;
            const ctx = createMockExecutionContext();
            const result = await tool.execute({}, ctx);

            expect(result.success).toBe(true);
            expect((result.output as any).projectName).toBe('test-project');
        });
    });
});
