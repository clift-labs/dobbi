import { describe, it, expect } from 'vitest';
import { ConfigurationManager } from '../../src/feral/configuration/configuration-manager.js';
import {
    ConfigurationValueType,
    isSecret,
    resolveValue,
    resolveUnmaskedValue,
} from '../../src/feral/configuration/configuration-value.js';
import type { ConfigurationValue } from '../../src/feral/configuration/configuration-value.js';

describe('ConfigurationValue helpers', () => {
    it('isSecret should identify SECRET types', () => {
        expect(isSecret({ key: 'k', type: ConfigurationValueType.SECRET })).toBe(true);
        expect(isSecret({ key: 'k', type: ConfigurationValueType.OPTIONAL_SECRET })).toBe(true);
        expect(isSecret({ key: 'k', type: ConfigurationValueType.STANDARD })).toBe(false);
        expect(isSecret({ key: 'k', type: ConfigurationValueType.OPTIONAL })).toBe(false);
    });

    it('resolveValue should mask secrets', () => {
        const secret: ConfigurationValue = {
            key: 'api_key',
            type: ConfigurationValueType.SECRET,
            value: 'my-secret-key',
        };
        expect(resolveValue(secret)).toBe('*********');
    });

    it('resolveValue should return non-secret values', () => {
        const standard: ConfigurationValue = {
            key: 'name',
            type: ConfigurationValueType.STANDARD,
            value: 'hello',
        };
        expect(resolveValue(standard)).toBe('hello');
    });

    it('resolveValue should fall back to default', () => {
        const cv: ConfigurationValue = {
            key: 'name',
            type: ConfigurationValueType.STANDARD,
            default: 'fallback',
        };
        expect(resolveValue(cv)).toBe('fallback');
    });

    it('resolveUnmaskedValue should return actual value', () => {
        const secret: ConfigurationValue = {
            key: 'api_key',
            type: ConfigurationValueType.SECRET,
            value: 'my-secret-key',
        };
        expect(resolveUnmaskedValue(secret)).toBe('my-secret-key');
    });
});

describe('ConfigurationManager', () => {
    it('should merge values', () => {
        const mgr = new ConfigurationManager();
        mgr.merge([
            { key: 'url', type: ConfigurationValueType.STANDARD, value: 'http://example.com' },
        ]);
        expect(mgr.getValue('url')).toBe('http://example.com');
    });

    it('should override values on re-merge', () => {
        const mgr = new ConfigurationManager();
        mgr.merge([{ key: 'url', type: ConfigurationValueType.STANDARD, value: 'v1' }]);
        mgr.merge([{ key: 'url', type: ConfigurationValueType.STANDARD, value: 'v2' }]);
        expect(mgr.getValue('url')).toBe('v2');
    });

    it('should delete values with _DELETE_ sentinel', () => {
        const mgr = new ConfigurationManager();
        mgr.merge([{ key: 'url', type: ConfigurationValueType.STANDARD, value: 'v1' }]);
        mgr.merge([{ key: 'url', type: ConfigurationValueType.STANDARD, value: ConfigurationManager.DELETE }]);
        expect(mgr.getValue('url')).toBeNull();
    });

    it('should fall back to default value', () => {
        const mgr = new ConfigurationManager();
        mgr.merge([{ key: 'page', type: ConfigurationValueType.STANDARD, default: 1 }]);
        expect(mgr.getValue('page')).toBe(1);
    });

    it('should return null for unknown keys', () => {
        const mgr = new ConfigurationManager();
        expect(mgr.getValue('unknown')).toBeNull();
    });

    it('should report hasValue correctly', () => {
        const mgr = new ConfigurationManager();
        mgr.merge([{ key: 'a', type: ConfigurationValueType.STANDARD, value: 'yes' }]);
        mgr.merge([{ key: 'b', type: ConfigurationValueType.STANDARD, default: 'no' }]);
        expect(mgr.hasValue('a')).toBe(true);
        expect(mgr.hasValue('b')).toBe(false);
    });

    it('should report hasDefault correctly', () => {
        const mgr = new ConfigurationManager();
        mgr.merge([{ key: 'a', type: ConfigurationValueType.STANDARD, default: 'yes' }]);
        expect(mgr.hasDefault('a')).toBe(true);
        expect(mgr.hasDefault('missing')).toBe(false);
    });
});
