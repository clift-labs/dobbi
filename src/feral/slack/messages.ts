// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Message Types
// ─────────────────────────────────────────────────────────────────────────────

import type { BlockInterface, MessageInterface } from './types.js';

/**
 * Abstract base for all Slack message types.
 */
abstract class AbstractMessage implements MessageInterface {
    abstract readonly maxBlocks: number;
    channel?: string;
    text?: string;
    threadTs?: string;
    private blocks: BlockInterface[] = [];

    addBlock(block: BlockInterface): void {
        if (this.blocks.length >= this.maxBlocks) {
            throw new Error(`Cannot add more than ${this.maxBlocks} blocks to this message.`);
        }
        this.blocks.push(block);
    }

    getBlocks(): BlockInterface[] {
        return [...this.blocks];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {};
        if (this.channel) json.channel = this.channel;
        if (this.text) json.text = this.text;
        if (this.threadTs) json.thread_ts = this.threadTs;
        if (this.blocks.length > 0) {
            json.blocks = this.blocks.map(b => b.toJSON());
        }
        return json;
    }
}

/**
 * Standard Slack message (max 50 blocks).
 */
export class Message extends AbstractMessage {
    readonly maxBlocks = 50;
}

/**
 * Modal view message (max 100 blocks).
 */
export class ModalMessage extends AbstractMessage {
    readonly maxBlocks = 100;
}

/**
 * Home tab view message (max 50 blocks).
 */
export class HomeTabMessage extends AbstractMessage {
    readonly maxBlocks = 50;
}
