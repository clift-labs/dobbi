// ─────────────────────────────────────────────────────────────────────────────
// Feral Agent — Agent Brain Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of an AgentBrain thinking step.
 */
export interface AgentThought {
    /** The action/decision the brain recommends */
    action: string;
    /** Any parameters for the action */
    parameters: Record<string, unknown>;
    /** The brain's reasoning */
    reasoning: string;
    /** Whether the brain considers the task complete */
    done: boolean;
}

/**
 * Interface for AI brain implementations.
 * The brain interprets prompts and produces structured decisions.
 */
export interface AgentBrain {
    /** Process a prompt and return a structured thought */
    think(prompt: string): Promise<AgentThought>;
}
