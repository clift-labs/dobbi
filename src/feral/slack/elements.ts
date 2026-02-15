// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Element Data Objects
// ─────────────────────────────────────────────────────────────────────────────

import { BlockType, ElementType, type BlockTypeValue, type ElementInterface, type StyleValue } from './types.js';
import type { Text, Option, Confirmation } from './composition.js';

/**
 * Button element.
 */
export class Button implements ElementInterface {
    readonly type = ElementType.BUTTON;
    actionId: string;
    text: Text;
    url?: string;
    value?: string;
    style?: StyleValue;
    confirm?: Confirmation;

    constructor(actionId: string, text: Text) {
        this.actionId = actionId;
        this.text = text;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.ACTIONS, BlockType.SECTION];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
            text: this.text.toJSON(),
        };
        if (this.url) json.url = this.url;
        if (this.value) json.value = this.value;
        if (this.style) json.style = this.style;
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}

/**
 * Checkbox group element.
 */
export class Checkbox implements ElementInterface {
    readonly type = ElementType.CHECKBOX;
    actionId: string;
    options: Option[] = [];
    initialOptions?: Option[];
    confirm?: Confirmation;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.ACTIONS, BlockType.SECTION];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
            options: this.options.map(o => o.toJSON()),
        };
        if (this.initialOptions) json.initial_options = this.initialOptions.map(o => o.toJSON());
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}

/**
 * Date picker element.
 */
export class DatePicker implements ElementInterface {
    readonly type = ElementType.DATE_PICKER;
    actionId: string;
    placeholder?: Text;
    initialDate?: string; // YYYY-MM-DD
    confirm?: Confirmation;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.ACTIONS, BlockType.SECTION, BlockType.INPUT];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
        };
        if (this.placeholder) json.placeholder = this.placeholder.toJSON();
        if (this.initialDate) json.initial_date = this.initialDate;
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}

/**
 * Image element (not a block — used within Section/Context).
 */
export class ImageElement implements ElementInterface {
    readonly type = ElementType.IMAGE;
    imageUrl: string;
    altText: string;

    constructor(imageUrl: string, altText: string) {
        this.imageUrl = imageUrl;
        this.altText = altText;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.SECTION, BlockType.CONTEXT];
    }

    toJSON(): Record<string, unknown> {
        return {
            type: this.type,
            image_url: this.imageUrl,
            alt_text: this.altText,
        };
    }
}

/**
 * Plain text input element.
 */
export class PlainTextInput implements ElementInterface {
    readonly type = ElementType.PLAIN_TEXT_INPUT;
    actionId: string;
    placeholder?: Text;
    initialValue?: string;
    multiline = false;
    minLength?: number;
    maxLength?: number;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.INPUT, BlockType.SECTION, BlockType.ACTIONS];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
        };
        if (this.placeholder) json.placeholder = this.placeholder.toJSON();
        if (this.initialValue) json.initial_value = this.initialValue;
        if (this.multiline) json.multiline = this.multiline;
        if (this.minLength !== undefined) json.min_length = this.minLength;
        if (this.maxLength !== undefined) json.max_length = this.maxLength;
        return json;
    }
}

/**
 * Multi-select menu element.
 */
export class MultiSelect implements ElementInterface {
    readonly type = ElementType.MULTI_SELECT;
    actionId: string;
    options: Option[] = [];
    initialOptions?: Option[];
    placeholder?: Text;
    confirm?: Confirmation;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.SECTION, BlockType.ACTIONS, BlockType.INPUT];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
            options: this.options.map(o => o.toJSON()),
        };
        if (this.initialOptions) json.initial_options = this.initialOptions.map(o => o.toJSON());
        if (this.placeholder) json.placeholder = this.placeholder.toJSON();
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}

/**
 * Overflow menu element.
 */
export class Overflow implements ElementInterface {
    readonly type = ElementType.OVERFLOW;
    actionId: string;
    options: Option[] = [];
    confirm?: Confirmation;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.ACTIONS, BlockType.SECTION];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
            options: this.options.map(o => o.toJSON()),
        };
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}

/**
 * Radio button group element.
 */
export class RadioButton implements ElementInterface {
    readonly type = ElementType.RADIO_BUTTON;
    actionId: string;
    options: Option[] = [];
    initialOption?: Option;
    confirm?: Confirmation;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.ACTIONS, BlockType.SECTION, BlockType.INPUT];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
            options: this.options.map(o => o.toJSON()),
        };
        if (this.initialOption) json.initial_option = this.initialOption.toJSON();
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}

/**
 * Select menu element.
 */
export class Select implements ElementInterface {
    readonly type = ElementType.SELECT;
    actionId: string;
    options: Option[] = [];
    initialOption?: Option;
    placeholder?: Text;
    confirm?: Confirmation;

    constructor(actionId: string) {
        this.actionId = actionId;
    }

    getValidBlocks(): BlockTypeValue[] {
        return [BlockType.ACTIONS, BlockType.SECTION, BlockType.INPUT];
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            type: this.type,
            action_id: this.actionId,
            options: this.options.map(o => o.toJSON()),
        };
        if (this.initialOption) json.initial_option = this.initialOption.toJSON();
        if (this.placeholder) json.placeholder = this.placeholder.toJSON();
        if (this.confirm) json.confirm = this.confirm.toJSON();
        return json;
    }
}
