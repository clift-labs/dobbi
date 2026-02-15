// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Event Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

import type { ProcessEvent } from './events.js';

export type EventHandler<T extends ProcessEvent = ProcessEvent> = (event: T) => void;

export class EventDispatcher {
    private handlers: Map<string, EventHandler[]> = new Map();

    on<T extends ProcessEvent>(type: T['type'], handler: EventHandler<T>): void {
        if (!this.handlers.has(type)) this.handlers.set(type, []);
        this.handlers.get(type)!.push(handler as EventHandler);
    }

    off<T extends ProcessEvent>(type: T['type'], handler: EventHandler<T>): void {
        const list = this.handlers.get(type);
        if (list) {
            const idx = list.indexOf(handler as EventHandler);
            if (idx >= 0) list.splice(idx, 1);
        }
    }

    dispatch(event: ProcessEvent): void {
        const list = this.handlers.get(event.type);
        if (list) {
            for (const handler of list) handler(event);
        }
    }
}
