import { describe, it, expect } from 'vitest';
import { QueueFullError, ServiceNotRunningError } from '../../src/service/protocol.js';

describe('Protocol Errors', () => {

    describe('QueueFullError', () => {
        it('should have correct name', () => {
            const err = new QueueFullError();
            expect(err.name).toBe('QueueFullError');
        });

        it('should have descriptive message', () => {
            const err = new QueueFullError();
            expect(err.message).toContain('maximum capacity');
        });

        it('should be an instance of Error', () => {
            const err = new QueueFullError();
            expect(err).toBeInstanceOf(Error);
        });
    });

    describe('ServiceNotRunningError', () => {
        it('should have correct name', () => {
            const err = new ServiceNotRunningError();
            expect(err.name).toBe('ServiceNotRunningError');
        });

        it('should have descriptive message', () => {
            const err = new ServiceNotRunningError();
            expect(err.message).toContain('not running');
        });

        it('should be an instance of Error', () => {
            const err = new ServiceNotRunningError();
            expect(err).toBeInstanceOf(Error);
        });
    });
});
