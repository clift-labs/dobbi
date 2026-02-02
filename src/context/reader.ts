import { promises as fs } from 'fs';
import path from 'path';
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
    } catch {
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
 * Gets the context for the current active project.
 */
export async function getProjectContext(projectName: string): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const projectPath = path.join(vaultRoot, 'projects', projectName);
    return getContextString(projectPath);
}

/**
 * Gets the context for notes in a project.
 * Gathers .socks.md files in this order (broadest to most specific):
 * 1. .socks.md (root)
 * 2. projects/.socks.md
 * 3. projects/{project}/.socks.md
 * 4. projects/{project}/notes/.socks.md
 */
export async function getNotesContext(projectName: string): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const contexts: string[] = [];

    // Define the hierarchy from root to notes (broadest to most specific)
    const hierarchy = [
        vaultRoot,                                           // .socks.md
        path.join(vaultRoot, 'projects'),                    // projects/.socks.md
        path.join(vaultRoot, 'projects', projectName),       // projects/{project}/.socks.md
        path.join(vaultRoot, 'projects', projectName, 'notes') // projects/{project}/notes/.socks.md
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
 * Gets context for a specific subdirectory within a project.
 * Gathers .socks.md files in this order (broadest to most specific):
 * 1. .socks.md (root)
 * 2. projects/.socks.md
 * 3. projects/{project}/.socks.md
 * 4. projects/{project}/{subdirectory}/.socks.md
 *
 * @param projectName - The project name
 * @param subdirectory - The subdirectory within the project (e.g., 'notes', 'research', 'todos')
 */
export async function getSubdirectoryContext(projectName: string, subdirectory: string): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const contexts: string[] = [];

    // Define the hierarchy from root to subdirectory (broadest to most specific)
    const hierarchy = [
        vaultRoot,                                              // .socks.md
        path.join(vaultRoot, 'projects'),                       // projects/.socks.md
        path.join(vaultRoot, 'projects', projectName),          // projects/{project}/.socks.md
        path.join(vaultRoot, 'projects', projectName, subdirectory) // projects/{project}/{subdirectory}/.socks.md
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
 * Gets the context for todos in a project.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getTodosContext(projectName: string): Promise<string> {
    return getSubdirectoryContext(projectName, 'todos');
}

/**
 * Gets the context for events in a project.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getEventsContext(projectName: string): Promise<string> {
    return getSubdirectoryContext(projectName, 'events');
}

/**
 * Gets the context for inbox in a project.
 * Convenience wrapper for getSubdirectoryContext.
 */
export async function getInboxContext(projectName: string): Promise<string> {
    return getSubdirectoryContext(projectName, 'inbox');
}
