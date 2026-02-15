// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Event Types
// ─────────────────────────────────────────────────────────────────────────────

import type { Process } from '../process/process.js';
import type { ProcessNode } from '../process/node.js';
import type { Context } from '../context/context.js';
import type { Result } from '../result/result.js';
import type { NodeCode } from '../node-code/node-code.js';

export interface ProcessStartEvent {
    type: 'process.start';
    process: Process;
    context: Context;
}

export interface ProcessEndEvent {
    type: 'process.end';
    process: Process;
    context: Context;
}

export interface ProcessNodeBeforeEvent {
    type: 'process.node.before';
    node: ProcessNode;
    context: Context;
}

export interface ProcessNodeAfterEvent {
    type: 'process.node.after';
    node: ProcessNode;
    context: Context;
    result: Result;
}

export interface ProcessExceptionEvent {
    type: 'process.exception';
    nodeCode: NodeCode;
    context: Context;
    error: Error;
}

export interface ProcessNodeNotifyEvent {
    type: 'process.node.notify';
    nodeCode: NodeCode;
    context: Context;
    notice: string;
}

export type ProcessEvent =
    | ProcessStartEvent
    | ProcessEndEvent
    | ProcessNodeBeforeEvent
    | ProcessNodeAfterEvent
    | ProcessExceptionEvent
    | ProcessNodeNotifyEvent;

export type EventType = ProcessEvent['type'];
