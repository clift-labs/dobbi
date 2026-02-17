// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Output Catalog Source
// ─────────────────────────────────────────────────────────────────────────────
//
// Auto-generates a speak_* CatalogNode for every Dobbie ResponseKey.
// Each node binds the dobbie_speak NodeCode with a specific response_key.
// ─────────────────────────────────────────────────────────────────────────────

import type { CatalogNode } from './catalog-node.js';
import responses from '../../responses.js';

// All response keys from the catalog
const RESPONSE_KEYS = Object.keys(responses) as string[];

function humanize(key: string): string {
    return key
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export class OutputCatalogSource {
    getCatalogNodes(): CatalogNode[] {
        return RESPONSE_KEYS.map(key => ({
            key: `speak_${key}`,
            nodeCodeKey: 'dobbie_speak',
            name: `Speak — ${humanize(key)}`,
            group: 'output',
            description: `Outputs a random Dobbie "${key}" response with token replacement.`,
            configuration: {
                response_key: key,
                context_path: 'output',
            },
        }));
    }
}
