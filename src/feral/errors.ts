// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Error Classes
// ─────────────────────────────────────────────────────────────────────────────

export class FeralError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FeralError';
    }
}

export class InvalidConfigurationError extends FeralError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidConfigurationError';
    }
}

export class InvalidNodeCodeKeyError extends FeralError {
    constructor(key: string) {
        super(`Invalid NodeCode key: "${key}"`);
        this.name = 'InvalidNodeCodeKeyError';
    }
}

export class InvalidNodeKeyError extends FeralError {
    constructor(key: string) {
        super(`Invalid node key: "${key}"`);
        this.name = 'InvalidNodeKeyError';
    }
}

export class MaximumNodeRunsError extends FeralError {
    constructor(key: string, max: number) {
        super(`Node "${key}" exceeded maximum runs (${max})`);
        this.name = 'MaximumNodeRunsError';
    }
}

export class MissingConfigurationValueError extends FeralError {
    constructor(key: string) {
        super(`Missing required configuration value: "${key}"`);
        this.name = 'MissingConfigurationValueError';
    }
}

export class ProcessError extends FeralError {
    constructor(message: string) {
        super(message);
        this.name = 'ProcessError';
    }
}

export class ModelSchemaNotFoundError extends FeralError {
    constructor(key: string) {
        super(`Model schema not found: "${key}"`);
        this.name = 'ModelSchemaNotFoundError';
    }
}

export class AgentMaxIterationsError extends FeralError {
    constructor(maxIterations: number) {
        super(`Agent exceeded maximum iterations (${maxIterations})`);
        this.name = 'AgentMaxIterationsError';
    }
}
