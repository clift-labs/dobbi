// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Process JSON Hydrator
// ─────────────────────────────────────────────────────────────────────────────

import { DefaultContext } from '../context/context.js';
import type { ProcessNode } from './node.js';
import type { Edge } from './edge.js';
import type { Process } from './process.js';

/**
 * Tool metadata that can be embedded in a process JSON to auto-register
 * it as a service tool.
 */
export interface ProcessToolMeta {
    type: 'deterministic' | 'ai';
    capability?: string;
    input_schema?: {
        type: string;
        properties?: Record<string, {
            type: string;
            description?: string;
            required?: boolean;
            items?: { type: string };
            properties?: Record<string, { type: string; description?: string }>;
        }>;
        required?: string[];
    };
    canvas_type?: string;
}

/**
 * JSON schema for a process configuration file.
 */
export interface ProcessConfigJson {
    schema_version: number;
    key: string;
    version?: number;
    description?: string;
    tool?: ProcessToolMeta;
    context: Record<string, unknown>;
    nodes: Array<{
        key: string;
        description?: string;
        catalog_node_key: string;
        configuration: Record<string, unknown>;
        edges: Record<string, string>;  // result → target node key
    }>;
}

/**
 * Hydrates a Process from a validated JSON configuration.
 */
export function hydrateProcess(json: ProcessConfigJson): Process {
    if (json.schema_version !== 1) {
        throw new Error('Only schema version 1 is accepted.');
    }
    if (!json.key) {
        throw new Error('A key is required for a process.');
    }

    const context = new DefaultContext();
    for (const [k, v] of Object.entries(json.context ?? {})) {
        context.set(k, v);
    }

    const nodes: ProcessNode[] = [];
    const edges: Edge[] = [];

    for (const nodeDef of json.nodes) {
        nodes.push({
            key: nodeDef.key,
            description: nodeDef.description ?? '',
            catalogNodeKey: nodeDef.catalog_node_key,
            configuration: nodeDef.configuration ?? {},
        });

        for (const [result, toKey] of Object.entries(nodeDef.edges ?? {})) {
            edges.push({ fromKey: nodeDef.key, toKey, result });
        }
    }

    return {
        key: json.key,
        description: json.description ?? '',
        tool: json.tool,
        context,
        nodes,
        edges,
    };
}

/**
 * Convenience: parse a raw JSON string into a Process.
 */
export function hydrateProcessFromString(jsonString: string): Process {
    const parsed = JSON.parse(jsonString) as ProcessConfigJson;
    return hydrateProcess(parsed);
}
