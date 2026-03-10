import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { getVaultRoot } from '../state/manager.js';
import { parseEntity } from '../entities/entity.js';
import { debug } from '../utils/debug.js';
import { getResponse } from '../responses.js';
import { isTodontActive } from './todont.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface DayItem {
    title: string;
    type: 'todo' | 'event' | 'todont';
    time?: string;        // HH:mm for events
    status?: string;
    priority?: string;
}

interface DayColumn {
    date: string;          // YYYY-MM-DD
    dayName: string;       // Sunday, Monday…
    dayShort: string;      // Sun, Mon…
    dayNum: string;        // 17
    month: string;         // Feb
    isToday: boolean;
    items: DayItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getWeekDays(refDate: Date): DayColumn[] {
    const today = new Date(refDate);
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    // Find Sunday of this week
    const dayOfWeek = today.getDay(); // 0=Sun
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);

    const days: DayColumn[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        const dateStr = formatDate(d);
        days.push({
            date: dateStr,
            dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
            dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate().toString(),
            month: d.toLocaleDateString('en-US', { month: 'short' }),
            isToday: dateStr === todayStr,
            items: [],
        });
    }
    return days;
}

function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY SCANNING
// ─────────────────────────────────────────────────────────────────────────────

async function scanDir(dir: string): Promise<{ meta: Record<string, unknown>; content: string }[]> {
    const results: { meta: Record<string, unknown>; content: string }[] = [];
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            if (!file.endsWith('.md') || file.startsWith('.')) continue;
            try {
                const filepath = path.join(dir, file);
                const raw = await fs.readFile(filepath, 'utf-8');
                results.push(parseEntity(filepath, raw));
            } catch (err) {
                debug('week', `Failed to parse ${file}: ${err}`);
            }
        }
    } catch {
        // directory doesn't exist
    }
    return results;
}

async function populateItems(days: DayColumn[]): Promise<void> {
    const vaultRoot = await getVaultRoot();

    const dateSet = new Set(days.map(d => d.date));
    const dateMap = new Map(days.map(d => [d.date, d]));

    // Scan todos — match on dueDate
    const todoDir = path.join(vaultRoot, 'todos');
    const todoEntities = await scanDir(todoDir);
    for (const { meta } of todoEntities) {
        const due = meta.dueDate as string | undefined;
        if (due && dateSet.has(due)) {
            const day = dateMap.get(due)!;
            day.items.push({
                title: (meta.title as string) || 'Untitled',
                type: 'todo',
                status: meta.status as string | undefined,
                priority: meta.priority as string | undefined,
            });
        }
    }

    // Scan events — match on startDate (YYYY-MM-DD prefix)
    const eventDir = path.join(vaultRoot, 'events');
    const eventEntities = await scanDir(eventDir);
    for (const { meta } of eventEntities) {
        const start = meta.startDate as string | undefined;
        if (!start) continue;
        const datePrefix = start.slice(0, 10); // YYYY-MM-DD
        if (dateSet.has(datePrefix)) {
            const day = dateMap.get(datePrefix)!;
            const timePart = start.length > 10 ? start.slice(11, 16) : undefined;
            day.items.push({
                title: (meta.title as string) || 'Untitled',
                type: 'event',
                time: timePart,
            });
        }
    }

    // Scan todonts — active for any day in the range
    const todontDir = path.join(vaultRoot, 'todonts');
    const todontEntities = await scanDir(todontDir);
    for (const { meta } of todontEntities) {
        for (const day of days) {
            if (isTodontActive(meta, day.date)) {
                day.items.push({
                    title: (meta.title as string) || 'Untitled',
                    type: 'todont',
                });
            }
        }
    }

    // Sort items: events with time first (sorted by time), then todos, then todonts
    for (const day of days) {
        day.items.sort((a, b) => {
            if (a.type === 'event' && b.type === 'event') {
                return (a.time || '').localeCompare(b.time || '');
            }
            if (a.type === 'event') return -1;
            if (b.type === 'event') return 1;
            if (a.type === 'todont' && b.type !== 'todont') return 1;
            if (b.type === 'todont' && a.type !== 'todont') return -1;
            return 0;
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOX RENDERING
// ─────────────────────────────────────────────────────────────────────────────

const BOX_WIDTH = 24;

function statusIcon(item: DayItem): string {
    if (item.type === 'todont') return '🚫';
    if (item.type === 'event') return '📅';
    if (item.status === 'done') return '✅';
    if (item.status === 'in-progress') return '🔧';
    if (item.status === 'blocked') return '🚫';
    if (item.priority === 'critical') return '🔴';
    if (item.priority === 'high') return '🟠';
    return '◻️';
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}

function padRight(str: string, len: number): string {
    // Account for emoji width (most are 2 chars visually)
    const visLen = stripAnsi(str).length;
    const pad = Math.max(0, len - visLen);
    return str + ' '.repeat(pad);
}

function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function renderWeek(days: DayColumn[]): void {
    const inner = BOX_WIDTH - 2; // space inside the box edges

    // ── Header row ──────────────────────────────────────────────────────
    let topBorder = '';
    let headerLine = '';
    let dateLine = '';
    let headerBottom = '';

    for (let i = 0; i < 7; i++) {
        const day = days[i];
        const connector = i === 0 ? '┌' : '┬';
        topBorder += connector + '─'.repeat(inner);

        const label = day.isToday
            ? chalk.bold.cyan(day.dayShort)
            : chalk.white(day.dayShort);
        const dateLabel = day.isToday
            ? chalk.bold.cyan(`${day.month} ${day.dayNum}`)
            : chalk.dim(`${day.month} ${day.dayNum}`);

        headerLine += '│' + padRight(` ${label}`, inner);
        dateLine += '│' + padRight(` ${dateLabel}`, inner);

        const sep = i === 0 ? '├' : '┼';
        headerBottom += sep + '─'.repeat(inner);
    }
    topBorder += '┐';
    headerLine += '│';
    dateLine += '│';
    headerBottom += '┤';

    console.log(chalk.gray(topBorder));
    console.log(chalk.gray(headerLine));
    console.log(chalk.gray(dateLine));
    console.log(chalk.gray(headerBottom));

    // ── Item rows ───────────────────────────────────────────────────────
    const maxItems = Math.max(...days.map(d => d.items.length), 1);

    for (let row = 0; row < maxItems; row++) {
        let line = '';
        for (let i = 0; i < 7; i++) {
            const day = days[i];
            const item = day.items[row];
            if (item) {
                const icon = statusIcon(item);
                const timeStr = item.time ? chalk.dim(`${item.time} `) : '';
                const titleStr = truncate(item.title, inner - 5);
                const cell = ` ${icon} ${timeStr}${titleStr}`;
                line += '│' + padRight(cell, inner);
            } else {
                line += '│' + ' '.repeat(inner);
            }
        }
        line += '│';
        console.log(chalk.gray(line));
    }

    // ── Bottom border ───────────────────────────────────────────────────
    let bottomBorder = '';
    for (let i = 0; i < 7; i++) {
        const connector = i === 0 ? '└' : '┴';
        bottomBorder += connector + '─'.repeat(inner);
    }
    bottomBorder += '┘';
    console.log(chalk.gray(bottomBorder));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────────────────────────────────────

export const weekCommand = new Command('week')
    .description('Show the weekly calendar (Sun–Sat) with todos and events')
    .option('-n, --next', 'Show next week instead of current')
    .action(async (options) => {
        try {
            const ref = new Date();
            if (options.next) {
                ref.setDate(ref.getDate() + 7);
            }

            const days = getWeekDays(ref);
            await populateItems(days);

            // Title
            const weekStart = days[0];
            const weekEnd = days[6];
            const title = options.next ? 'Next Week' : 'This Week';
            console.log(chalk.bold.cyan(`\n📆 ${title} — ${weekStart.month} ${weekStart.dayNum} – ${weekEnd.month} ${weekEnd.dayNum}\n`));

            renderWeek(days);

            // Summary
            const totalItems = days.reduce((sum, d) => sum + d.items.length, 0);
            const totalEvents = days.reduce((sum, d) => sum + d.items.filter(i => i.type === 'event').length, 0);
            const totalTodonts = days.reduce((sum, d) => sum + d.items.filter(i => i.type === 'todont').length, 0);
            const totalTodos = totalItems - totalEvents - totalTodonts;
            const parts = [`${totalTodos} todos`, `${totalEvents} events`];
            if (totalTodonts > 0) parts.push(`${totalTodonts} todonts`);
            console.log(chalk.dim(`\n  ${totalItems} items: ${parts.join(', ')}\n`));

        } catch (error) {
            console.error(chalk.red(getResponse('error')), error instanceof Error ? error.message : error);
        }
    });

export default weekCommand;
