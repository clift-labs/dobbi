import { describe, it, expect, beforeEach } from 'vitest';
import {
    registerServiceTool,
    getServiceTool,
    listServiceTools,
    hasServiceTool,
    type ServiceTool,
} from '../../src/tools/types.js';

describe('Tool Registry', () => {

    const testTool: ServiceTool = {
        name: 'registry-test-tool',
        description: 'A tool for testing the registry',
        type: 'deterministic',
        execute: async () => ({ success: true, output: 'ok' }),
    };

    describe('registerServiceTool', () => {
        it('should register a tool without error', () => {
            expect(() => registerServiceTool(testTool)).not.toThrow();
        });
    });

    describe('getServiceTool', () => {
        it('should retrieve a registered tool by name', () => {
            registerServiceTool(testTool);
            const found = getServiceTool('registry-test-tool');
            expect(found).toBeDefined();
            expect(found?.name).toBe('registry-test-tool');
            expect(found?.description).toBe('A tool for testing the registry');
        });

        it('should return undefined for unregistered tool', () => {
            expect(getServiceTool('does-not-exist-12345')).toBeUndefined();
        });
    });

    describe('hasServiceTool', () => {
        it('should return true for registered tool', () => {
            registerServiceTool(testTool);
            expect(hasServiceTool('registry-test-tool')).toBe(true);
        });

        it('should return false for unregistered tool', () => {
            expect(hasServiceTool('nope-12345')).toBe(false);
        });
    });

    describe('listServiceTools', () => {
        it('should return an array', () => {
            const tools = listServiceTools();
            expect(Array.isArray(tools)).toBe(true);
        });

        it('should include registered tools', () => {
            registerServiceTool(testTool);
            const tools = listServiceTools();
            const names = tools.map(t => t.name);
            expect(names).toContain('registry-test-tool');
        });
    });

    describe('overwrite behavior', () => {
        it('should overwrite a tool with the same name', () => {
            registerServiceTool(testTool);
            const updatedTool: ServiceTool = {
                ...testTool,
                description: 'Updated description',
            };
            registerServiceTool(updatedTool);
            const found = getServiceTool('registry-test-tool');
            expect(found?.description).toBe('Updated description');
        });
    });
});
