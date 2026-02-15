import { describe, it, expect } from 'vitest';
import { EdgeCollection } from '../../src/feral/process/edge.js';
import { hydrateProcess, hydrateProcessFromString } from '../../src/feral/process/process-json-hydrator.js';
import { ProcessFactory } from '../../src/feral/process/process-factory.js';
import type { ProcessConfigJson } from '../../src/feral/process/process-json-hydrator.js';

const sampleProcessJson: ProcessConfigJson = {
    schema_version: 1,
    key: 'test-process',
    description: 'A test process',
    context: { greeting: 'hello' },
    nodes: [
        {
            key: 'start',
            description: 'Start node',
            catalog_node_key: 'catalog_start',
            configuration: {},
            edges: { ok: 'set_value' },
        },
        {
            key: 'set_value',
            description: 'Set a value',
            catalog_node_key: 'catalog_set_value',
            configuration: { value: 'world', context_path: 'target' },
            edges: { ok: 'end' },
        },
        {
            key: 'end',
            description: 'Stop node',
            catalog_node_key: 'catalog_stop',
            configuration: {},
            edges: {},
        },
    ],
};

describe('EdgeCollection', () => {
    it('should add and retrieve edges', () => {
        const collection = new EdgeCollection();
        collection.addEdge({ fromKey: 'a', toKey: 'b', result: 'ok' });
        collection.addEdge({ fromKey: 'a', toKey: 'c', result: 'error' });

        const okEdges = collection.getEdgesByNodeAndResult('a', 'ok');
        expect(okEdges).toHaveLength(1);
        expect(okEdges[0].toKey).toBe('b');

        const errorEdges = collection.getEdgesByNodeAndResult('a', 'error');
        expect(errorEdges).toHaveLength(1);
        expect(errorEdges[0].toKey).toBe('c');
    });

    it('should return empty array for missing nodes/results', () => {
        const collection = new EdgeCollection();
        expect(collection.getEdgesByNodeAndResult('unknown', 'ok')).toEqual([]);
    });

    it('should return all edges', () => {
        const collection = new EdgeCollection();
        collection.addEdge({ fromKey: 'a', toKey: 'b', result: 'ok' });
        collection.addEdge({ fromKey: 'b', toKey: 'c', result: 'ok' });
        expect(collection.getAllEdges()).toHaveLength(2);
    });
});

describe('hydrateProcess', () => {
    it('should create a Process from valid JSON', () => {
        const process = hydrateProcess(sampleProcessJson);
        expect(process.key).toBe('test-process');
        expect(process.description).toBe('A test process');
        expect(process.nodes).toHaveLength(3);
        expect(process.edges).toHaveLength(2);
        expect(process.context.get('greeting')).toBe('hello');
    });

    it('should throw for invalid schema version', () => {
        expect(() => hydrateProcess({ ...sampleProcessJson, schema_version: 99 })).toThrow(
            'Only schema version 1 is accepted',
        );
    });

    it('should throw for missing key', () => {
        expect(() => hydrateProcess({ ...sampleProcessJson, key: '' })).toThrow(
            'A key is required',
        );
    });

    it('should map edges from node definitions', () => {
        const process = hydrateProcess(sampleProcessJson);
        const startEdge = process.edges.find(e => e.fromKey === 'start');
        expect(startEdge).toBeDefined();
        expect(startEdge!.toKey).toBe('set_value');
        expect(startEdge!.result).toBe('ok');
    });
});

describe('hydrateProcessFromString', () => {
    it('should parse JSON string and hydrate', () => {
        const jsonString = JSON.stringify(sampleProcessJson);
        const process = hydrateProcessFromString(jsonString);
        expect(process.key).toBe('test-process');
        expect(process.nodes).toHaveLength(3);
    });
});

describe('ProcessFactory', () => {
    it('should build a process by key', () => {
        const process = hydrateProcess(sampleProcessJson);
        const factory = new ProcessFactory([{ getProcesses: () => [process] }]);
        const built = factory.build('test-process');
        expect(built.key).toBe('test-process');
    });

    it('should cache built processes', () => {
        const process = hydrateProcess(sampleProcessJson);
        const factory = new ProcessFactory([{ getProcesses: () => [process] }]);
        const first = factory.build('test-process');
        const second = factory.build('test-process');
        expect(first).toBe(second); // same reference
    });

    it('should throw for missing process', () => {
        const factory = new ProcessFactory([]);
        expect(() => factory.build('missing')).toThrow('Cannot find process');
    });
});
