import path from 'path';
import { promises as fs } from 'fs';
import matter from 'gray-matter';
import {
    type EventEntity,
    type EventRecurrence,
    slugify,
    createEntityMeta,
    ensureEntityDir,
    findEntityByTitle,
    writeEntity,
    getEntityDir,
} from '../entities/entity.js';
import { getVaultRoot, getActiveProject } from '../state/manager.js';
import { registerServiceTool, type ServiceToolResult } from './types.js';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Global events live in global/schedule/
// ─────────────────────────────────────────────────────────────────────────────

async function getGlobalEventsDir(): Promise<string> {
    const vaultRoot = await getVaultRoot();
    return path.join(vaultRoot, 'global', 'schedule');
}

async function ensureDir(dir: string): Promise<string> {
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

interface EventRecord {
    filepath: string;
    meta: Record<string, unknown>;
    content: string;
}

async function findEventInDir(dir: string, titleOrFilename: string): Promise<EventRecord | null> {
    const slug = slugify(titleOrFilename);
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (!file.endsWith('.md') || file.startsWith('.')) continue;
            const filepath = path.join(dir, file);
            const raw = await fs.readFile(filepath, 'utf-8');
            const { data, content } = matter(raw);
            const base = path.basename(file, '.md');
            if (
                base === slug ||
                base.endsWith(`-${slug}`) ||
                base.toLowerCase() === titleOrFilename.toLowerCase() ||
                (data.title && (data.title as string).toLowerCase() === titleOrFilename.toLowerCase())
            ) {
                return { filepath, meta: data, content: content.trim() };
            }
        }
    } catch (err) { debug('events', err); /* no dir yet */ }
    return null;
}

async function listEventsInDir(
    dir: string,
    filters?: { startDate?: string; endDate?: string },
): Promise<EventRecord[]> {
    const events: EventRecord[] = [];
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (!file.endsWith('.md') || file.startsWith('.')) continue;
            const filepath = path.join(dir, file);
            const raw = await fs.readFile(filepath, 'utf-8');
            const { data, content } = matter(raw);

            // Filter by date range
            if (filters?.startDate && data.startDate && data.startDate < filters.startDate) continue;
            if (filters?.endDate && data.startDate && data.startDate > filters.endDate) continue;

            events.push({ filepath, meta: data, content: content.trim() });
        }
    } catch (err) { debug('events', err); /* no dir */ }
    return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS.ADD
// ─────────────────────────────────────────────────────────────────────────────

registerServiceTool({
    name: 'events.add',
    description: 'Create a new event',
    type: 'deterministic',
    inputSchema: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Event title', required: true },
            startDate: { type: 'string', description: 'Start datetime (ISO 8601)', required: true },
            endDate: { type: 'string', description: 'End datetime (ISO 8601)', required: true },
            location: { type: 'string', description: 'Event location' },
            recurring: { type: 'string', description: 'Recurrence: daily, weekly, monthly, yearly' },
            content: { type: 'string', description: 'Event description' },
            tags: { type: 'array', description: 'Tags' },
            global: { type: 'boolean', description: 'Create as global event (not project-specific)' },
        },
        required: ['title', 'startDate', 'endDate'],
    },
    execute: async (input, context): Promise<ServiceToolResult> => {
        const {
            title, startDate, endDate, location, recurring,
            content = '', tags = [], global: isGlobal = false,
        } = input as {
            title: string; startDate: string; endDate: string;
            location?: string; recurring?: EventRecurrence;
            content?: string; tags?: string[]; global?: boolean;
        };

        context.log.info(`Creating event: ${title}`);

        const project = await getActiveProject();
        if (!project && !isGlobal) {
            return { success: false, output: null, error: 'No active project' };
        }

        // Choose directory
        let eventsDir: string;
        if (isGlobal) {
            eventsDir = await ensureDir(await getGlobalEventsDir());
        } else {
            eventsDir = await ensureEntityDir('event');
        }

        // Date prefix for sorting
        const datePrefix = startDate.split('T')[0];
        const slug = `${datePrefix}-${slugify(title)}`;
        const filepath = path.join(eventsDir, `${slug}.md`);

        const meta: EventEntity = {
            ...createEntityMeta('event', title, { tags, project: project ?? 'global' }),
            entityType: 'event',
            startDate,
            endDate,
            location,
            recurring,
        };

        await writeEntity(filepath, { ...meta }, content);

        context.log.info(`Event created: ${filepath}`);

        return {
            success: true,
            output: { filepath, title, startDate, endDate, location, recurring, content },
            canvasUpdate: {
                type: 'event',
                title,
                content,
                metadata: { startDate, endDate, location, recurring },
                dirty: false,
            },
        };
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS.UPDATE
// ─────────────────────────────────────────────────────────────────────────────

registerServiceTool({
    name: 'events.update',
    description: 'Update an existing event',
    type: 'deterministic',
    inputSchema: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Event title to update', required: true },
            startDate: { type: 'string', description: 'New start datetime' },
            endDate: { type: 'string', description: 'New end datetime' },
            location: { type: 'string', description: 'New location' },
            recurring: { type: 'string', description: 'Recurrence' },
            content: { type: 'string', description: 'New description' },
            tags: { type: 'array', description: 'Replace tags' },
            global: { type: 'boolean', description: 'Look in global events' },
        },
        required: ['title'],
    },
    execute: async (input, context): Promise<ServiceToolResult> => {
        const {
            title, startDate, endDate, location, recurring,
            content, tags, global: isGlobal = false,
        } = input as {
            title: string; startDate?: string; endDate?: string;
            location?: string; recurring?: EventRecurrence;
            content?: string; tags?: string[]; global?: boolean;
        };

        context.log.info(`Updating event: ${title}`);

        // Find event in project or global dir
        let found: EventRecord | null;
        if (isGlobal) {
            const dir = await getGlobalEventsDir();
            found = await findEventInDir(dir, title);
        } else {
            found = await findEntityByTitle('event', title) as EventRecord | null;
        }

        if (!found) {
            context.log.error(`Event not found: ${title}`);
            return { success: false, output: null, error: `Event "${title}" not found` };
        }

        const newContent = content !== undefined ? content : found.content;

        if (startDate !== undefined) found.meta.startDate = startDate;
        if (endDate !== undefined) found.meta.endDate = endDate;
        if (location !== undefined) found.meta.location = location;
        if (recurring !== undefined) found.meta.recurring = recurring;
        if (tags) found.meta.tags = tags;

        await writeEntity(found.filepath, found.meta, newContent);

        context.log.info(`Event updated: ${found.filepath}`);

        return {
            success: true,
            output: {
                filepath: found.filepath,
                title: found.meta.title,
                startDate: found.meta.startDate,
                endDate: found.meta.endDate,
                location: found.meta.location,
                content: newContent,
            },
        };
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS.REMOVE
// ─────────────────────────────────────────────────────────────────────────────

registerServiceTool({
    name: 'events.remove',
    description: 'Delete an event',
    type: 'deterministic',
    inputSchema: {
        type: 'object',
        properties: {
            title: { type: 'string', description: 'Event title to delete', required: true },
            global: { type: 'boolean', description: 'Look in global events' },
        },
        required: ['title'],
    },
    execute: async (input, context): Promise<ServiceToolResult> => {
        const { title, global: isGlobal = false } = input as { title: string; global?: boolean };

        context.log.info(`Removing event: ${title}`);

        let found: EventRecord | null;
        if (isGlobal) {
            const dir = await getGlobalEventsDir();
            found = await findEventInDir(dir, title);
        } else {
            found = await findEntityByTitle('event', title) as EventRecord | null;
        }

        if (!found) {
            context.log.error(`Event not found: ${title}`);
            return { success: false, output: null, error: `Event "${title}" not found` };
        }

        await fs.unlink(found.filepath);

        context.log.info(`Event removed: ${found.filepath}`);

        return {
            success: true,
            output: { filepath: found.filepath, title: found.meta.title, deleted: true },
        };
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS.REVIEW
// ─────────────────────────────────────────────────────────────────────────────

registerServiceTool({
    name: 'events.review',
    description: 'Review events with AI for scheduling advice',
    type: 'ai',
    capability: 'reason',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Filter from date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'Filter to date (YYYY-MM-DD)' },
        },
    },
    execute: async (input, context): Promise<ServiceToolResult> => {
        const { startDate, endDate } = input as { startDate?: string; endDate?: string };

        context.log.info('Reviewing events schedule');

        // Gather project + global events
        let projectDir: string;
        try {
            projectDir = await getEntityDir('event');
        } catch (err) {
            debug('events', err);
            projectDir = '';
        }
        const globalDir = await getGlobalEventsDir();

        const projectEvents = projectDir ? await listEventsInDir(projectDir, { startDate, endDate }) : [];
        const globalEvents = await listEventsInDir(globalDir, { startDate, endDate });

        const allEvents = [...projectEvents, ...globalEvents].sort((a, b) => {
            const aStart = (a.meta.startDate as string) || '';
            const bStart = (b.meta.startDate as string) || '';
            return aStart.localeCompare(bStart);
        });

        const fullContext = await context.ctx.getFullContext('events');

        const eventsText = allEvents.map(e =>
            `- ${e.meta.startDate} → ${e.meta.endDate}: ${e.meta.title}${e.meta.location ? ` @ ${e.meta.location}` : ''}`
        ).join('\n');

        const prompt = `Review this schedule and provide insights on time management and potential conflicts.

Events:
${eventsText || '(No events scheduled)'}

Provide a helpful analysis of the schedule.`;

        const review = await context.llm.chat([
            { role: 'system', content: fullContext.combined },
            { role: 'user', content: prompt },
        ]);

        context.log.info('Review completed');

        return {
            success: true,
            output: { events: allEvents.map(e => ({ ...e.meta, content: e.content })), review },
        };
    },
});

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS.LIST
// ─────────────────────────────────────────────────────────────────────────────

registerServiceTool({
    name: 'events.list',
    description: 'List all events',
    type: 'deterministic',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Filter from date' },
            endDate: { type: 'string', description: 'Filter to date' },
            global: { type: 'boolean', description: 'Include global events' },
        },
    },
    execute: async (input, context): Promise<ServiceToolResult> => {
        const { startDate, endDate, global: includeGlobal = true } = input as {
            startDate?: string; endDate?: string; global?: boolean;
        };

        context.log.info('Listing events');

        let projectDir: string;
        try {
            projectDir = await getEntityDir('event');
        } catch (err) {
            debug('events', err);
            projectDir = '';
        }
        const events = projectDir ? await listEventsInDir(projectDir, { startDate, endDate }) : [];

        if (includeGlobal) {
            const globalDir = await getGlobalEventsDir();
            const globalEvents = await listEventsInDir(globalDir, { startDate, endDate });
            events.push(...globalEvents);
        }

        events.sort((a, b) => {
            const aStart = (a.meta.startDate as string) || '';
            const bStart = (b.meta.startDate as string) || '';
            return aStart.localeCompare(bStart);
        });

        const result = events.map(e => ({
            title: e.meta.title as string,
            filepath: e.filepath,
            startDate: e.meta.startDate as string,
            endDate: e.meta.endDate as string,
            location: e.meta.location as string | undefined,
            recurring: e.meta.recurring as string | undefined,
            tags: (e.meta.tags as string[]) || [],
        }));

        return { success: true, output: { events: result } };
    },
});
