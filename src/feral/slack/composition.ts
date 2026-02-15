// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Composition Objects
// ─────────────────────────────────────────────────────────────────────────────

import { TextType, type TextTypeValue, type StyleValue } from './types.js';

/**
 * Text composition object (plain_text or mrkdwn).
 */
export class Text {
    readonly type: TextTypeValue;
    text: string;
    emoji?: boolean;
    verbatim?: boolean;

    constructor(text: string, type: TextTypeValue = TextType.PLAIN_TEXT) {
        this.type = type;
        this.text = text;
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = { type: this.type, text: this.text };
        if (this.emoji !== undefined) json.emoji = this.emoji;
        if (this.verbatim !== undefined) json.verbatim = this.verbatim;
        return json;
    }
}

/**
 * Option composition object.
 */
export class Option {
    text: Text;
    value: string;
    description?: Text;
    url?: string;

    constructor(text: Text, value: string) {
        this.text = text;
        this.value = value;
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            text: this.text.toJSON(),
            value: this.value,
        };
        if (this.description) json.description = this.description.toJSON();
        if (this.url) json.url = this.url;
        return json;
    }
}

/**
 * Option group composition object.
 */
export class OptionGroup {
    label: Text;
    options: Option[];

    constructor(label: Text, options: Option[] = []) {
        this.label = label;
        this.options = options;
    }

    toJSON(): Record<string, unknown> {
        return {
            label: this.label.toJSON(),
            options: this.options.map(o => o.toJSON()),
        };
    }
}

/**
 * Confirmation dialog composition object.
 */
export class Confirmation {
    title: Text;
    text: Text;
    confirm: Text;
    deny: Text;
    style?: StyleValue;

    constructor(title: Text, text: Text, confirm: Text, deny: Text) {
        this.title = title;
        this.text = text;
        this.confirm = confirm;
        this.deny = deny;
    }

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {
            title: this.title.toJSON(),
            text: this.text.toJSON(),
            confirm: this.confirm.toJSON(),
            deny: this.deny.toJSON(),
        };
        if (this.style) json.style = this.style;
        return json;
    }
}

/**
 * Filter composition object.
 */
export class Filter {
    include?: string[];
    excludeExternalSharedChannels?: boolean;
    excludeBotUsers?: boolean;

    toJSON(): Record<string, unknown> {
        const json: Record<string, unknown> = {};
        if (this.include) json.include = this.include;
        if (this.excludeExternalSharedChannels !== undefined) {
            json.exclude_external_shared_channels = this.excludeExternalSharedChannels;
        }
        if (this.excludeBotUsers !== undefined) {
            json.exclude_bot_users = this.excludeBotUsers;
        }
        return json;
    }
}
