import { describe, it, expect, vi } from 'vitest';
import { EventDispatcher } from '../../src/feral/events/event-dispatcher.js';
import { createLoggerSubscriber } from '../../src/feral/events/subscribers/logger-subscriber.js';
import { createCycleDetectionSubscriber } from '../../src/feral/events/subscribers/cycle-detection-subscriber.js';
import { MaximumNodeRunsError } from '../../src/feral/errors.js';
import type { ProcessStartEvent, ProcessNodeBeforeEvent, ProcessNodeAfterEvent } from '../../src/feral/events/events.js';
import { ResultStatus } from '../../src/feral/result/result.js';
import { DefaultContext } from '../../src/feral/context/context.js';

describe('EventDispatcher', () => {
    it('should dispatch events to registered handlers', () => {
        const dispatcher = new EventDispatcher();
        const handler = vi.fn();
        dispatcher.on('process.start', handler);

        const event: ProcessStartEvent = {
            type: 'process.start',
            process: { key: 'test', description: '', context: new DefaultContext(), nodes: [], edges: [] },
            context: new DefaultContext(),
        };

        dispatcher.dispatch(event);
        expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not fire removed handlers', () => {
        const dispatcher = new EventDispatcher();
        const handler = vi.fn();
        dispatcher.on('process.start', handler);
        dispatcher.off('process.start', handler);

        dispatcher.dispatch({
            type: 'process.start',
            process: { key: 'test', description: '', context: new DefaultContext(), nodes: [], edges: [] },
            context: new DefaultContext(),
        });

        expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple handlers for same event type', () => {
        const dispatcher = new EventDispatcher();
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        dispatcher.on('process.start', handler1);
        dispatcher.on('process.start', handler2);

        dispatcher.dispatch({
            type: 'process.start',
            process: { key: 'test', description: '', context: new DefaultContext(), nodes: [], edges: [] },
            context: new DefaultContext(),
        });

        expect(handler1).toHaveBeenCalledOnce();
        expect(handler2).toHaveBeenCalledOnce();
    });
});

describe('Logger Subscriber', () => {
    it('should log process start and end', () => {
        const logs: string[] = [];
        const dispatcher = new EventDispatcher();
        createLoggerSubscriber((msg) => logs.push(msg))(dispatcher);

        dispatcher.dispatch({
            type: 'process.start',
            process: { key: 'my-process', description: '', context: new DefaultContext(), nodes: [], edges: [] },
            context: new DefaultContext(),
        });

        dispatcher.dispatch({
            type: 'process.end',
            process: { key: 'my-process', description: '', context: new DefaultContext(), nodes: [], edges: [] },
            context: new DefaultContext(),
        });

        expect(logs).toContain('Process "my-process" started');
        expect(logs).toContain('Process "my-process" ended');
    });

    it('should log node results', () => {
        const logs: string[] = [];
        const dispatcher = new EventDispatcher();
        createLoggerSubscriber((msg) => logs.push(msg))(dispatcher);

        const afterEvent: ProcessNodeAfterEvent = {
            type: 'process.node.after',
            node: { key: 'node1', description: '', catalogNodeKey: 'cat1', configuration: {} },
            context: new DefaultContext(),
            result: { status: ResultStatus.OK, message: 'done' },
        };
        dispatcher.dispatch(afterEvent);

        expect(logs[0]).toContain('Node "node1"');
        expect(logs[0]).toContain('ok');
    });
});

describe('Cycle Detection Subscriber', () => {
    it('should throw when a node exceeds max runs', () => {
        const dispatcher = new EventDispatcher();
        createCycleDetectionSubscriber(3)(dispatcher);

        const event: ProcessNodeBeforeEvent = {
            type: 'process.node.before',
            node: { key: 'loop-node', description: '', catalogNodeKey: 'cat', configuration: {} },
            context: new DefaultContext(),
        };

        // First 3 should be fine
        dispatcher.dispatch(event);
        dispatcher.dispatch(event);
        dispatcher.dispatch(event);

        // 4th should throw
        expect(() => dispatcher.dispatch(event)).toThrow(MaximumNodeRunsError);
    });
});
