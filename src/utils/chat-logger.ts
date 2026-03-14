// ─────────────────────────────────────────────────────────────────────────────
// Chat Session Logger — structured JSONL logs per chat session
// ─────────────────────────────────────────────────────────────────────────────
//
// Each chat session gets its own file: {vault}/.dobbi/logs/<chatId>.log
// ─────────────────────────────────────────────────────────────────────────────

import { createWriteStream, type WriteStream } from 'fs';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { getLogsDir } from '../paths.js';
import path from 'path';

export type ChatLogType =
    | 'start'
    | 'node_selection'
    | 'process_match'
    | 'process_design'
    | 'process_result'
    | 'completion_check'
    | 'response'
    | 'error';

/**
 * Generate a short chat ID like `chat-a3f2b1`.
 */
export function generateChatId(): string {
    return 'chat-' + crypto.randomBytes(3).toString('hex');
}

export class ChatLogger {
    private stream: WriteStream | null = null;
    private initPromise: Promise<void> | null = null;
    private initFailed = false;
    private _chatId: string;

    constructor(chatId: string) {
        this._chatId = chatId;
    }

    get chatId(): string {
        return this._chatId;
    }

    /**
     * Append a structured log entry. Lazily creates the log directory and file.
     */
    async log(type: ChatLogType, data: Record<string, unknown>): Promise<void> {
        if (this.initFailed) return;

        if (!this.stream) {
            if (!this.initPromise) {
                this.initPromise = this.init();
            }
            try {
                await this.initPromise;
            } catch {
                this.initFailed = true;
                return;
            }
        }

        const line = JSON.stringify({
            ts: new Date().toISOString(),
            type,
            data,
        });

        this.stream!.write(line + '\n');
    }

    /**
     * Flush and close the write stream.
     */
    close(): void {
        if (this.stream) {
            this.stream.end();
            this.stream = null;
        }
    }

    private async init(): Promise<void> {
        const logsDir = await getLogsDir();
        await fs.mkdir(logsDir, { recursive: true });
        const logFile = path.join(logsDir, `${this._chatId}.log`);
        this.stream = createWriteStream(logFile, { flags: 'a' });
    }
}
