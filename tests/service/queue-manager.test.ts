import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { QueueManager, resetQueueManager } from '../../src/service/queue/manager.js';
import { createMockTask } from '../helpers.js';

// Mock the persistence module
vi.mock('../../src/service/queue/queue-persistence.js', () => ({
    saveQueueState: vi.fn(),
    loadQueueState: vi.fn().mockResolvedValue(null),
    clearQueueState: vi.fn(),
}));

describe('QueueManager', () => {
    let qm: QueueManager;

    beforeEach(() => {
        resetQueueManager();
        qm = new QueueManager();
    });

    // ── Enqueue / Dequeue ────────────────────────────────────────────────

    describe('enqueue', () => {
        it('should add a task and return its ID', () => {
            const task = createMockTask({ id: 'task-1' });
            const id = qm.enqueue(task);
            expect(id).toBe('task-1');
            expect(qm.size()).toBe(1);
        });

        it('should set status to "queued"', () => {
            const task = createMockTask({ status: 'processing' });
            qm.enqueue(task);
            expect(task.status).toBe('queued');
        });

        it('should set createdAt timestamp', () => {
            const task = createMockTask();
            const before = new Date();
            qm.enqueue(task);
            expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        });
    });

    describe('dequeue', () => {
        it('should return tasks in FIFO order', () => {
            const t1 = createMockTask({ id: 'first' });
            const t2 = createMockTask({ id: 'second' });
            qm.enqueue(t1);
            qm.enqueue(t2);

            const out = qm.dequeue();
            expect(out?.id).toBe('first');
            expect(qm.size()).toBe(1);
        });

        it('should return null when queue is empty', () => {
            expect(qm.dequeue()).toBeNull();
        });

        it('should set status to "processing" on dequeue', () => {
            const task = createMockTask();
            qm.enqueue(task);
            const dequeued = qm.dequeue();
            expect(dequeued?.status).toBe('processing');
        });

        it('should set startedAt timestamp on dequeue', () => {
            const task = createMockTask();
            qm.enqueue(task);
            const dequeued = qm.dequeue();
            expect(dequeued?.startedAt).toBeInstanceOf(Date);
        });
    });

    // ── Capacity ─────────────────────────────────────────────────────────

    describe('capacity', () => {
        it('should report isFull at max capacity', () => {
            for (let i = 0; i < 10; i++) {
                qm.enqueue(createMockTask({ id: `task-${i}` }));
            }
            expect(qm.isFull()).toBe(true);
            expect(qm.size()).toBe(10);
        });

        it('should throw QueueFullError when at capacity', () => {
            for (let i = 0; i < 10; i++) {
                qm.enqueue(createMockTask({ id: `task-${i}` }));
            }
            expect(() => qm.enqueue(createMockTask({ id: 'overflow' }))).toThrow('Queue is at maximum capacity');
        });

        it('should report maxSize as 10', () => {
            expect(qm.maxSize()).toBe(10);
        });

        it('should not be full when empty', () => {
            expect(qm.isFull()).toBe(false);
        });
    });

    // ── getTask ──────────────────────────────────────────────────────────

    describe('getTask', () => {
        it('should find a task in the active queue', () => {
            const task = createMockTask({ id: 'find-me' });
            qm.enqueue(task);
            expect(qm.getTask('find-me')).toBe(task);
        });

        it('should find a completed task', () => {
            const task = createMockTask({ id: 'completed-one' });
            qm.enqueue(task);
            qm.dequeue();
            qm.completeTask(task);
            expect(qm.getTask('completed-one')).toBe(task);
        });

        it('should return null for unknown task', () => {
            expect(qm.getTask('does-not-exist')).toBeNull();
        });
    });

    // ── updateTask ───────────────────────────────────────────────────────

    describe('updateTask', () => {
        it('should update a task in the active queue', () => {
            const task = createMockTask({ id: 'upd-1' });
            qm.enqueue(task);
            qm.updateTask('upd-1', { name: 'Updated Name' });
            expect(qm.getTask('upd-1')?.name).toBe('Updated Name');
        });

        it('should update a completed task', () => {
            const task = createMockTask({ id: 'upd-2' });
            qm.enqueue(task);
            qm.dequeue();
            qm.completeTask(task);
            qm.updateTask('upd-2', { name: 'Post-complete Update' });
            expect(qm.getTask('upd-2')?.name).toBe('Post-complete Update');
        });
    });

    // ── completeTask ─────────────────────────────────────────────────────

    describe('completeTask', () => {
        it('should mark task as completed', () => {
            const task = createMockTask({ id: 'c-1' });
            qm.enqueue(task);
            qm.dequeue();
            qm.completeTask(task);
            expect(task.status).toBe('completed');
            expect(task.completedAt).toBeInstanceOf(Date);
        });

        it('should mark task as error when given error string', () => {
            const task = createMockTask({ id: 'e-1' });
            qm.enqueue(task);
            qm.dequeue();
            qm.completeTask(task, 'Something went wrong');
            expect(task.status).toBe('error');
            expect(task.error).toBe('Something went wrong');
        });

        it('should track completedCount and errorCount', () => {
            const t1 = createMockTask({ id: 'ok' });
            const t2 = createMockTask({ id: 'fail' });
            qm.enqueue(t1);
            qm.enqueue(t2);
            qm.dequeue();
            qm.completeTask(t1);
            qm.dequeue();
            qm.completeTask(t2, 'err');

            const status = qm.getFullStatus();
            expect(status.completedCount).toBe(1);
            expect(status.errorCount).toBe(1);
        });
    });

    // ── clear ────────────────────────────────────────────────────────────

    describe('clear', () => {
        it('should empty the queue', () => {
            qm.enqueue(createMockTask({ id: 'a' }));
            qm.enqueue(createMockTask({ id: 'b' }));
            const cleared = qm.clear();
            expect(cleared).toBe(2);
            expect(qm.size()).toBe(0);
        });
    });

    // ── getFullStatus ────────────────────────────────────────────────────

    describe('getFullStatus', () => {
        it('should report correct idle status', () => {
            const status = qm.getFullStatus();
            expect(status.size).toBe(0);
            expect(status.maxSize).toBe(10);
            expect(status.isFull).toBe(false);
            expect(status.processing).toBe(0);
            expect(status.pending).toBe(0);
            expect(status.completedCount).toBe(0);
            expect(status.errorCount).toBe(0);
        });
    });

    // ── waitForTask ──────────────────────────────────────────────────────

    describe('waitForTask', () => {
        it('should resolve immediately for already completed tasks', async () => {
            const task = createMockTask({ id: 'done' });
            qm.enqueue(task);
            qm.dequeue();
            qm.completeTask(task);

            const result = await qm.waitForTask('done');
            expect(result.status).toBe('completed');
        });

        it('should reject for non-existent task', async () => {
            await expect(qm.waitForTask('nope')).rejects.toThrow('Task not found');
        });

        it('should resolve when task completes later', async () => {
            const task = createMockTask({ id: 'later' });
            qm.enqueue(task);
            // waitForTask while task is still in queue (not yet dequeued by processor)
            const waitPromise = qm.waitForTask('later', 5000);
            // Simulate processor: dequeue then complete
            const dequeued = qm.dequeue()!;
            qm.completeTask(dequeued);
            const result = await waitPromise;
            expect(result.status).toBe('completed');
        });

        it('should reject on timeout', async () => {
            const task = createMockTask({ id: 'slow' });
            qm.enqueue(task);
            // Wait while task is still queued (not dequeued)
            await expect(qm.waitForTask('slow', 100)).rejects.toThrow('Timeout');
        });
    });
});
