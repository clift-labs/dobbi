// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Context
// ─────────────────────────────────────────────────────────────────────────────

export interface Context {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    has(key: string): boolean;
    remove(key: string): void;
    clear(key: string): boolean;
    getAll(): Record<string, unknown>;

    // Typed accessors
    getInt(key: string): number;
    getFloat(key: string): number;
    getString(key: string): string;
    getArray(key: string): unknown[];
    getObject<T = Record<string, unknown>>(key: string): T;
}

export class DefaultContext implements Context {
    private data: Record<string, unknown> = {};

    set(key: string, value: unknown): void {
        this.data[key] = value;
    }

    get(key: string): unknown {
        return this.data[key] ?? null;
    }

    has(key: string): boolean {
        return key in this.data && this.data[key] != null;
    }

    remove(key: string): void {
        this.data[key] = null;
    }

    clear(key: string): boolean {
        if (this.has(key)) {
            this.data[key] = null;
            return true;
        }
        return false;
    }

    getAll(): Record<string, unknown> {
        return { ...this.data };
    }

    getInt(key: string): number {
        return Number(this.data[key]) | 0;
    }

    getFloat(key: string): number {
        return Number(this.data[key]);
    }

    getString(key: string): string {
        return String(this.data[key] ?? '');
    }

    getArray(key: string): unknown[] {
        return Array.isArray(this.data[key]) ? (this.data[key] as unknown[]) : [];
    }

    getObject<T = Record<string, unknown>>(key: string): T {
        return this.data[key] as T;
    }
}
