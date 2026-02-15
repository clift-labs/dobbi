// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Process Trace
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single trace entry for a node execution.
 */
export interface TraceEntry {
    nodeKey: string;
    startTime: number;
    endTime: number;
    durationMs: number;
    resultStatus: string;
    resultMessage: string;
}

/**
 * Full process trace with timing data.
 */
export interface ProcessTrace {
    processKey: string;
    startTime: number;
    endTime: number;
    totalDurationMs: number;
    entries: TraceEntry[];
}

/**
 * Collects timing and execution data for process runs.
 */
export interface ProcessTraceCollector {
    startProcess(processKey: string): void;
    endProcess(): ProcessTrace;
    startNode(nodeKey: string): void;
    endNode(nodeKey: string, resultStatus: string, resultMessage: string): void;
}

/**
 * Default implementation of ProcessTraceCollector.
 */
export class DefaultProcessTraceCollector implements ProcessTraceCollector {
    private processKey = '';
    private processStartTime = 0;
    private nodeStartTimes: Map<string, number> = new Map();
    private entries: TraceEntry[] = [];

    startProcess(processKey: string): void {
        this.processKey = processKey;
        this.processStartTime = Date.now();
        this.entries = [];
        this.nodeStartTimes.clear();
    }

    endProcess(): ProcessTrace {
        const endTime = Date.now();
        return {
            processKey: this.processKey,
            startTime: this.processStartTime,
            endTime,
            totalDurationMs: endTime - this.processStartTime,
            entries: [...this.entries],
        };
    }

    startNode(nodeKey: string): void {
        this.nodeStartTimes.set(nodeKey, Date.now());
    }

    endNode(nodeKey: string, resultStatus: string, resultMessage: string): void {
        const startTime = this.nodeStartTimes.get(nodeKey) ?? Date.now();
        const endTime = Date.now();
        this.entries.push({
            nodeKey,
            startTime,
            endTime,
            durationMs: endTime - startTime,
            resultStatus,
            resultMessage,
        });
    }
}
