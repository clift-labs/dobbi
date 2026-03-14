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
    nodeCodeKey?: string;
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
    {
        key: 'get_cron_schedule',
        name: 'Get Cron Schedule',
        description: 'Shows all cron jobs with their enabled/disabled status and interval in minutes.',
        target: 'cron_schedule',
        contextPath: 'cron_schedule',
    },
    {
        key: 'list_processes',
        name: 'List Processes',
        description: 'Lists all available reusable processes with their keys and descriptions.',
        target: '',
        contextPath: 'processes',
        nodeCodeKey: 'list_processes',
    },
    {
        key: 'list_catalog_nodes',
        name: 'List Catalog Nodes',
        description: 'Lists all available catalog nodes (capabilities) grouped by category.',
        target: '',
        contextPath: 'catalog_nodes',
        nodeCodeKey: 'list_catalog_nodes',
    },
];

export class IntrospectCatalogSource {
    getCatalogNodes(): CatalogNode[] {
        return INTROSPECT_NODES.map(entry => ({
            key: entry.key,
            nodeCodeKey: entry.nodeCodeKey ?? 'introspect',
            name: entry.name,
            group: 'introspection',
            description: entry.description,
            configuration: {
                ...(entry.target ? { target: entry.target } : {}),
                context_path: entry.contextPath,
            },
        }));
    }
}
