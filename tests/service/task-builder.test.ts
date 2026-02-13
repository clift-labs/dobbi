import { describe, it, expect } from 'vitest';
import { TaskBuilder } from '../../src/service/task/builder.js';

describe('TaskBuilder', () => {

    describe('create', () => {
        it('should create a task with a name and UUID', () => {
            const task = TaskBuilder.create('Test Task').build();
            expect(task.name).toBe('Test Task');
            expect(task.id).toBeDefined();
            expect(task.id.length).toBeGreaterThan(0);
        });

        it('should set default values', () => {
            const task = TaskBuilder.create('Defaults').build();
            expect(task.scope).toEqual({ type: 'global' });
            expect(task.currentStepIndex).toBe(0);
            expect(task.status).toBe('queued');
            expect(task.context.tokens).toEqual({});
            expect(task.context.previousOutputs).toEqual([]);
            expect(task.log).toEqual([]);
            expect(task.createdAt).toBeInstanceOf(Date);
        });
    });

    describe('forProject', () => {
        it('should set project scope', () => {
            const task = TaskBuilder.create('Proj')
                .forProject('my-project')
                .build();
            expect(task.scope).toEqual({ type: 'project', projectName: 'my-project' });
        });
    });

    describe('forGlobal', () => {
        it('should set global scope', () => {
            const task = TaskBuilder.create('Global')
                .forProject('temporary')
                .forGlobal()
                .build();
            expect(task.scope).toEqual({ type: 'global' });
        });
    });

    describe('forSession', () => {
        it('should set session ID', () => {
            const task = TaskBuilder.create('Session')
                .forSession('sess-123')
                .build();
            expect(task.sessionId).toBe('sess-123');
        });
    });

    describe('forEntity', () => {
        it('should set entity type in context', () => {
            const task = TaskBuilder.create('Entity')
                .forEntity('notes')
                .build();
            expect(task.context.entity).toBe('notes');
        });
    });

    describe('withCanvas', () => {
        it('should set canvas in context', () => {
            const canvas = { type: 'note' as const, title: 'test', content: 'hi', dirty: false };
            const task = TaskBuilder.create('Canvas')
                .withCanvas(canvas)
                .build();
            expect(task.context.canvas).toEqual(canvas);
        });
    });

    describe('withTokens', () => {
        it('should set tokens in context', () => {
            const task = TaskBuilder.create('Tokens')
                .withTokens({ key1: 'val1', key2: 'val2' })
                .build();
            expect(task.context.tokens).toEqual({ key1: 'val1', key2: 'val2' });
        });

        it('should merge tokens when called multiple times', () => {
            const task = TaskBuilder.create('Merge')
                .withTokens({ a: '1' })
                .withTokens({ b: '2' })
                .build();
            expect(task.context.tokens).toEqual({ a: '1', b: '2' });
        });
    });

    describe('addStep', () => {
        it('should add steps in order', () => {
            const task = TaskBuilder.create('Steps')
                .addStep('tool-a', { foo: 'bar' })
                .addStep('tool-b', { baz: 1 })
                .build();

            expect(task.steps).toHaveLength(2);
            expect(task.steps[0].toolName).toBe('tool-a');
            expect(task.steps[0].input).toEqual({ foo: 'bar' });
            expect(task.steps[0].status).toBe('pending');
            expect(task.steps[1].toolName).toBe('tool-b');
        });

        it('should assign unique IDs to each step', () => {
            const task = TaskBuilder.create('UniqueIDs')
                .addStep('a', {})
                .addStep('b', {})
                .build();
            expect(task.steps[0].id).not.toBe(task.steps[1].id);
        });
    });

    describe('fluent chaining', () => {
        it('should support full fluent chain', () => {
            const task = TaskBuilder.create('Full Chain')
                .forProject('project-x')
                .forSession('sess-1')
                .forEntity('todos')
                .withTokens({ project_name: 'project-x' })
                .addStep('tasks.add', { title: 'Do something' })
                .addStep('tasks.list', {})
                .build();

            expect(task.name).toBe('Full Chain');
            expect(task.scope).toEqual({ type: 'project', projectName: 'project-x' });
            expect(task.sessionId).toBe('sess-1');
            expect(task.context.entity).toBe('todos');
            expect(task.context.tokens.project_name).toBe('project-x');
            expect(task.steps).toHaveLength(2);
        });
    });
});
