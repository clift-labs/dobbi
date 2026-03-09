// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Introspect Catalog Source
// ─────────────────────────────────────────────────────────────────────────────
//
// Pre-configured CatalogNodes for common introspection queries.
// Each node binds the `introspect` NodeCode with a specific target.
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogNode } from './catalog-node.js';

interface IntrospectEntry {
    key: string;
    name: string;
    description: string;
    target: string;
    contextPath: string;
}

const INTROSPECT_NODES: IntrospectEntry[] = [
    {
        key: 'get_user_profile',
        name: 'Get User Profile',
        description: 'Loads the user profile (name, gender, work type, etc.) into context.',
        target: 'user_profile',
        contextPath: 'user_profile',
    },
    {
        key: 'get_configured_providers',
        name: 'Get Configured Providers',
        description: 'Lists which AI providers have API keys configured (names only, no keys).',
        target: 'providers',
        contextPath: 'configured_providers',
    },
    {
        key: 'get_capability_config',
        name: 'Get Capability Config',
        description: 'Shows the effective provider+model mapping for each LLM capability.',
        target: 'capabilities',
        contextPath: 'capability_config',
    },
    {
        key: 'get_service_status',
        name: 'Get Service Status',
        description: 'Checks whether the Dobbi daemon is running and its PID.',
        target: 'service',
        contextPath: 'service_status',
    },
    {
        key: 'get_vault_info',
        name: 'Get Vault Info',
        description: 'Returns the vault root path, active project, and list of all projects.',
        target: 'vault',
        contextPath: 'vault_info',
    },
];

export class IntrospectCatalogSource {
    getCatalogNodes(): CatalogNode[] {
        return INTROSPECT_NODES.map(entry => ({
            key: entry.key,
            nodeCodeKey: 'introspect',
            name: entry.name,
            group: 'introspection',
            description: entry.description,
            configuration: {
                target: entry.target,
                context_path: entry.contextPath,
            },
        }));
    }
}
