// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Profiler Event Subscriber
// ─────────────────────────────────────────────────────────────────────────────

import type { EventDispatcher } from '../event-dispatcher.js';
import type {
    ProcessStartEvent,
    ProcessEndEvent,
    ProcessNodeBeforeEvent,
    ProcessNodeAfterEvent,
} from '../events.js';
import type { ProcessTraceCollector, ProcessTrace } from '../../trace/process-trace.js';

/**
 * Creates a subscriber that records timing data for each node.
 * Uses a ProcessTraceCollector to build a trace of the process execution.
 */
export function createProfilerSubscriber(
    collector: ProcessTraceCollector,
    onComplete?: (trace: ProcessTrace) => void,
): (dispatcher: EventDispatcher) => void {
    return (dispatcher) => {
        dispatcher.on<ProcessStartEvent>('process.start', (e) => {
            collector.startProcess(e.process.key);
        });

        dispatcher.on<ProcessNodeBeforeEvent>('process.node.before', (e) => {
            collector.startNode(e.node.key);
        });

        dispatcher.on<ProcessNodeAfterEvent>('process.node.after', (e) => {
            collector.endNode(e.node.key, e.result.status, e.result.message);
        });

        dispatcher.on<ProcessEndEvent>('process.end', () => {
            const trace = collector.endProcess();
            if (onComplete) {
                onComplete(trace);
            }
        });
    };
}
