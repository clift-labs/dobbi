// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Agent Interface
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../context/context.js';

/**
 * Result status for agent execution.
 */
export const AgentResult = {
    SUCCESS: 'success',
    FAILURE: 'failure',
    MAX_ITERATIONS: 'max_iterations',
} as const;
export type AgentResultValue = (typeof AgentResult)[keyof typeof AgentResult];

/**
 * Outcome of an agent run.
 */
export interface AgentOutcome {
    status: AgentResultValue;
    message: string;
    context: Context;
    iterations: number;
}

/**
 * Interface for agents that execute multi-step tasks using a brain.
 */
export interface Agent {
    /** Execute the agent with the given prompt and initial context */
    run(prompt: string, context?: Context): Promise<AgentOutcome>;
}
