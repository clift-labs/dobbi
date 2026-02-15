// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Block Data Objects
// ─────────────────────────────────────────────────────────────────────────────

import { BlockType, Surface, type BlockInterface, type ElementInterface, type SurfaceType } from './types.js';
import type { Text } from './composition.js';

/**
 * Section block — the most versatile block type.
 */
export class Section implements BlockInterface {
    readonly type = BlockType.SECTION;
    blockId?: string;
    text?: Text;
    fields?: Text[];
    accessory?: ElementInterface;

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MESSAGE, Surface.MODAL, Surface.HOME_TAB];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = { type: this.type };
        if (this.blockId) json.block_id = this.blockId;
        if (this.text) json.text = this.text.toJSON();
        if (this.fields) json.fields = this.fields.map(f => f.toJSON());
        if (this.accessory) json.accessory = this.accessory.toJSON();
        return json;
    }
}

/**
 * Actions block — holds interactive elements.
 */
export class Actions implements BlockInterface {
    readonly type = BlockType.ACTIONS;
    blockId?: string;
    elements: ElementInterface[] = [];

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MESSAGE, Surface.MODAL, Surface.HOME_TAB];
    }

    addElement(element: ElementInterface): void {
        this.elements.push(element);
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            elements: this.elements.map(e => e.toJSON()),
        };
        if (this.blockId) json.block_id = this.blockId;
        return json;
    }
}

/**
 * Context block — displays contextual info.
 */
export class ContextBlock implements BlockInterface {
    readonly type = BlockType.CONTEXT;
    blockId?: string;
    elements: (ElementInterface | Text)[] = [];

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MESSAGE, Surface.MODAL, Surface.HOME_TAB];
    }

    addElement(element: ElementInterface | Text): void {
        this.elements.push(element);
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            elements: this.elements.map(e => e.toJSON()),
        };
        if (this.blockId) json.block_id = this.blockId;
        return json;
    }
}

/**
 * Divider block — a visual separator.
 */
export class Divider implements BlockInterface {
    readonly type = BlockType.DIVIDER;
    blockId?: string;

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MESSAGE, Surface.MODAL, Surface.HOME_TAB];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = { type: this.type };
        if (this.blockId) json.block_id = this.blockId;
        return json;
    }
}

/**
 * File block — for displaying remote files.
 */
export class FileBlock implements BlockInterface {
    readonly type = BlockType.FILE;
    blockId?: string;
    externalId: string;
    source = 'remote';

    constructor(externalId: string) {
        this.externalId = externalId;
    }

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MESSAGE];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            external_id: this.externalId,
            source: this.source,
        };
        if (this.blockId) json.block_id = this.blockId;
        return json;
    }
}

/**
 * Image block — for displaying images.
 */
export class ImageBlock implements BlockInterface {
    readonly type = BlockType.IMAGE;
    blockId?: string;
    imageUrl: string;
    altText: string;
    title?: Text;

    constructor(imageUrl: string, altText: string) {
        this.imageUrl = imageUrl;
        this.altText = altText;
    }

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MESSAGE, Surface.MODAL, Surface.HOME_TAB];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            image_url: this.imageUrl,
            alt_text: this.altText,
        };
        if (this.blockId) json.block_id = this.blockId;
        if (this.title) json.title = this.title.toJSON();
        return json;
    }
}

/**
 * Input block — collects user input (modal only).
 */
export class InputBlock implements BlockInterface {
    readonly type = BlockType.INPUT;
    blockId?: string;
    label: Text;
    element?: ElementInterface;
    hint?: Text;
    optional = false;
    dispatchAction = false;

    constructor(label: Text) {
        this.label = label;
    }

    getValidSurfaces(): SurfaceType[] {
        return [Surface.MODAL];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            label: this.label.toJSON(),
        };
        if (this.blockId) json.block_id = this.blockId;
        if (this.element) json.element = this.element.toJSON();
        if (this.hint) json.hint = this.hint.toJSON();
        if (this.optional) json.optional = this.optional;
        if (this.dispatchAction) json.dispatch_action = this.dispatchAction;
        return json;
    }
}
