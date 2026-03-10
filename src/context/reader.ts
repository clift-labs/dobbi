import { promises as fs } from 'fs';
import path from 'path';
import { debug } from '../utils/debug.js';
import { getVaultRoot } from '../state/manager.js';

const SOCKS_FILE = '.socks.md';

/**
 * Reads a single .socks.md file if it exists.
 * Returns the content or null if not found.
 */
async function readSocksFile(dirPath: string): Promise<string | null> {
    const socksPath = path.join(dirPath, SOCKS_FILE);
    try {
        return await fs.readFile(socksPath, 'utf-8');
    } catch (err) {
        debug('context', err);
        return null;
    }
}

/**
 * Reads .socks.md files from the target path up to the vault root.
 * Returns an array of context strings, ordered from deepest to root.
 */
export async function buildContextChain(targetPath: string): Promise<string[]> {
    const vaultRoot = await getVaultRoot();
    const contexts: string[] = [];

    let currentPath = path.resolve(targetPath);
    const rootPath = path.resolve(vaultRoot);

    // Walk up the directory tree
    while (currentPath.startsWith(rootPath)) {
        const content = await readSocksFile(currentPath);
        if (content) {
            contexts.push(content);
        }

        // Move to parent
        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            break; // Reached filesystem root
        }
        currentPath = parentPath;
    }

    return contexts;
}

/**
 * Gets the full context chain as a single formatted string.
 * Order: root (broadest) to target (most specific).
 */
export async function getContextString(targetPath: string): Promise<string> {
    const contexts = await buildContextChain(targetPath);

    if (contexts.length === 0) {
        return '';
    }

    // Reverse so root context comes first (most general to most specific)
    const orderedContexts = contexts.reverse();

    return orderedContexts.join('\n\n---\n\n');
}

/**
 * Gets the context for the vault root.
 */
export async function getVaultContext(): Promise<string> {
    const vaultRoot = await getVaultRoot();
    return getContextString(vaultRoot);
}

/**
 * Gets the context for notes in the vault.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getNotesContext(): Promise<string> {
    return getSubdirectoryContext('notes');
}

/**
 * Gets context for a specific subdirectory within the vault.
 * Gathers .socks.md files in this order (broadest to most specific):
 * 1. .socks.md (vault root)
 * 2. {subdirectory}/.socks.md
 *
 * @param subdirectory - The subdirectory within the vault (e.g., 'notes', 'research', 'todos')
 */
export async function getSubdirectoryContext(subdirectory: string): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const contexts: string[] = [];

    // Define the hierarchy from root to subdirectory (broadest to most specific)
    const hierarchy = [
        vaultRoot,                                              // .socks.md
        path.join(vaultRoot, subdirectory),                     // {subdirectory}/.socks.md
    ];

    for (const dirPath of hierarchy) {
        const content = await readSocksFile(dirPath);
        if (content) {
            contexts.push(content);
        }
    }

    return contexts.join('\n\n---\n\n');
}

/**
 * Gets the context for todos in the vault.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getTodosContext(): Promise<string> {
    return getSubdirectoryContext('todos');
}

/**
 * Gets the context for events in the vault.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getEventsContext(): Promise<string> {
    return getSubdirectoryContext('events');
}

/**
 * Gets the context for inbox in the vault.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getInboxContext(): Promise<string> {
    return getSubdirectoryContext('inbox');
}

/**
 * Gets the context for people in the vault.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getPeopleContext(): Promise<string> {
    return getSubdirectoryContext('people');
}

/**
 * Gets enriched context that includes .socks.md chain PLUS resolved
 * @mentions and entity:slug cross-references found in the entity content.
 */
export async function getEnrichedContext(
    subdirectory: string,
    entityContent: string,
): Promise<string> {
    const { resolveReferences } = await import('./mentions.js');
    const baseContext = await getSubdirectoryContext(subdirectory);
    const refsContext = await resolveReferences(entityContent);
    return refsContext ? `${baseContext}\n\n---\n\n${refsContext}` : baseContext;
}
