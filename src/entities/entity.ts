// ─────────────────────────────────────────────────────────────────────────────
// ENTITY MODEL
// All records in Dobbie are Entities — markdown files with gray-matter frontmatter.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { debug } from '../utils/debug.js';
import { getVaultRoot, getActiveProject } from '../state/manager.js';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EntityTypeName = 'note' | 'task' | 'event' | 'research' | 'goal';

export type TaskStatus = 'open' | 'in-progress' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
export type GoalPriority = 'low' | 'medium' | 'high';

export type ResearchStatus = 'draft' | 'in-progress' | 'complete';

export type EventRecurrence = 'daily' | 'weekly' | 'monthly' | 'yearly';

// ─────────────────────────────────────────────────────────────────────────────
// BASE ENTITY (shared by all)
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityMeta {
    title: string;
    entityType: EntityTypeName;
    created: string;           // ISO 8601
    updated?: string;          // ISO 8601, set on every save
    tags: string[];
    project: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY-SPECIFIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Note — base only, no extra fields */
export interface NoteEntity extends EntityMeta {
    entityType: 'note';
}

/** Task — actionable item with due date */
export interface TaskEntity extends EntityMeta {
    entityType: 'task';
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;          // YYYY-MM-DD
}

/** Event — has start and end datetimes */
export interface EventEntity extends EntityMeta {
    entityType: 'event';
    startDate: string;         // ISO 8601 datetime
    endDate: string;           // ISO 8601 datetime
    location?: string;
    recurring?: EventRecurrence;
}

/** Research — tracked investigation */
export interface ResearchEntity extends EntityMeta {
    entityType: 'research';
    status: ResearchStatus;
    sources: string[];
}

/** SMART Goal */
export interface SmartFields {
    specific: string;          // What exactly will you accomplish?
    measurable: string;        // How will you measure success?
    achievable: string;        // Is this realistic?
    relevant: string;          // Why does this matter?
    timeBound: string;         // Target date YYYY-MM-DD
}

export interface GoalEntity extends EntityMeta {
    entityType: 'goal';
    status: GoalStatus;
    priority: GoalPriority;
    smart: Partial<SmartFields>;
    milestones: string[];
}

/** Discriminated union of all entity types */
export type Entity = NoteEntity | TaskEntity | EventEntity | ResearchEntity | GoalEntity;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Slugify a title into a URL/filename-safe string.
 */
export function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Create base entity metadata with defaults.
 */
export function createEntityMeta(
    entityType: EntityTypeName,
    title: string,
    opts: { tags?: string[]; project?: string } = {},
): EntityMeta {
    return {
        title,
        entityType,
        created: new Date().toISOString(),
        tags: opts.tags ?? [],
        project: opts.project ?? '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE I/O
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the directory for an entity type in the active project.
 */
export async function getEntityDir(entityType: EntityTypeName): Promise<string> {
    const vaultRoot = await getVaultRoot();
    const project = await getActiveProject();
    if (!project) {
        throw new Error('No active project. Use project.use first.');
    }
    // Map entity type to directory name
    const dirMap: Record<EntityTypeName, string> = {
        note: 'notes',
        task: 'todos',
        event: 'events',
        research: 'research',
        goal: 'goals',
    };
    return path.join(vaultRoot, 'projects', project, dirMap[entityType]);
}

/**
 * Ensure the entity directory exists, return its path.
 */
export async function ensureEntityDir(entityType: EntityTypeName): Promise<string> {
    const dir = await getEntityDir(entityType);
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

/**
 * Parse a markdown file into an Entity (frontmatter + body content).
 */
export function parseEntity(filepath: string, rawContent: string): { meta: Record<string, unknown>; content: string } {
    const { data, content } = matter(rawContent);
    // Ensure filepath is available for callers
    data._filepath = filepath;
    return { meta: data, content: content.trim() };
}

/**
 * Write an entity to a markdown file with frontmatter.
 * Sets `updated` timestamp automatically.
 */
export async function writeEntity(
    filepath: string,
    meta: Record<string, unknown>,
    content: string,
): Promise<void> {
    // Always update the timestamp on write
    meta.updated = new Date().toISOString();
    // Remove internal fields
    const cleanMeta = { ...meta };
    delete cleanMeta._filepath;
    // Strip undefined values — js-yaml can't serialize them
    for (const key of Object.keys(cleanMeta)) {
        if (cleanMeta[key] === undefined) {
            delete cleanMeta[key];
        }
    }
    const fileContent = matter.stringify(content, cleanMeta);
    await fs.writeFile(filepath, fileContent);
}

/**
 * Find an entity by title or filename within a directory.
 */
export async function findEntityByTitle(
    entityType: EntityTypeName,
    titleOrFilename: string,
): Promise<{ filepath: string; meta: Record<string, unknown>; content: string } | null> {
    let dir: string;
    try {
        dir = await getEntityDir(entityType);
    } catch (err) {
        debug('entities', err);
        return null;
    }
    const slug = slugify(titleOrFilename);

    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            if (!file.endsWith('.md') || file.startsWith('.')) continue;

            const filepath = path.join(dir, file);
            const rawContent = await fs.readFile(filepath, 'utf-8');
            const { meta, content } = parseEntity(filepath, rawContent);

            const fileBasename = path.basename(file, '.md');
            if (
                fileBasename === slug ||
                fileBasename.toLowerCase() === titleOrFilename.toLowerCase() ||
                (meta.title && (meta.title as string).toLowerCase() === titleOrFilename.toLowerCase())
            ) {
                return { filepath, meta, content };
            }
        }
    } catch (err) {
        debug('entities', err);
        // Directory doesn't exist yet
    }

    return null;
}

/**
 * List all entities of a given type in the active project.
 */
export async function listEntities(
    entityType: EntityTypeName,
): Promise<{ filepath: string; meta: Record<string, unknown>; content: string }[]> {
    let dir: string;
    try {
        dir = await getEntityDir(entityType);
    } catch (err) {
        debug('entities', err);
        return [];
    }

    const entities: { filepath: string; meta: Record<string, unknown>; content: string }[] = [];

    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            if (!file.endsWith('.md') || file.startsWith('.')) continue;

            const filepath = path.join(dir, file);
            const rawContent = await fs.readFile(filepath, 'utf-8');
            const { meta, content } = parseEntity(filepath, rawContent);

            entities.push({ filepath, meta, content });
        }
    } catch (err) {
        debug('entities', err);
        // Directory doesn't exist
    }

    return entities;
}
