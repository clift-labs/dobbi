// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Logger Event Subscriber
// ─────────────────────────────────────────────────────────────────────────────

import type { EventDispatcher } from '../event-dispatcher.js';
import type {
    ProcessStartEvent,
    ProcessEndEvent,
    ProcessNodeAfterEvent,
    ProcessExceptionEvent,
} from '../events.js';

/**
 * Creates a subscriber that logs process lifecycle events.
 */
export function createLoggerSubscriber(
    logger: (msg: string) => void,
): (dispatcher: EventDispatcher) => void {
    return (dispatcher) => {
        dispatcher.on<ProcessStartEvent>('process.start', (e) => {
            logger(`Process "${e.process.key}" started`);
        });
        dispatcher.on<ProcessEndEvent>('process.end', (e) => {
            logger(`Process "${e.process.key}" ended`);
        });
        dispatcher.on<ProcessNodeAfterEvent>('process.node.after', (e) => {
            logger(`Node "${e.node.key}" → ${e.result.status}: ${e.result.message}`);
        });
        dispatcher.on<ProcessExceptionEvent>('process.exception', (e) => {
            logger(`Exception in node: ${e.error.message}`);
        });
    };
}
