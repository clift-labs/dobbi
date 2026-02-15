// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Block Kit Type Constants & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

// Surface constants
export const Surface = {
    MESSAGE: 'message',
    MODAL: 'modal',
    HOME_TAB: 'home-tab',
} as const;
export type SurfaceType = (typeof Surface)[keyof typeof Surface];

// Block type constants
export const BlockType = {
    ACTIONS: 'actions',
    CONTEXT: 'context',
    DIVIDER: 'divider',
    FILE: 'file',
    IMAGE: 'image',
    INPUT: 'input',
    SECTION: 'section',
} as const;
export type BlockTypeValue = (typeof BlockType)[keyof typeof BlockType];

// Element type constants
export const ElementType = {
    BUTTON: 'button',
    CHECKBOX: 'checkboxes',
    DATE_PICKER: 'datepicker',
    IMAGE: 'image',
    MULTI_SELECT: 'multi_static_select',
    OVERFLOW: 'overflow',
    PLAIN_TEXT_INPUT: 'plain_text_input',
    RADIO_BUTTON: 'radio_buttons',
    SELECT: 'static_select',
    TIME_PICKER: 'timepicker',
    URL_INPUT: 'url_text_input',
} as const;
export type ElementTypeValue = (typeof ElementType)[keyof typeof ElementType];

// Style constants
export const Style = {
    PRIMARY: 'primary',
    DANGER: 'danger',
} as const;
export type StyleValue = (typeof Style)[keyof typeof Style];

// Text type constants
export const TextType = {
    PLAIN_TEXT: 'plain_text',
    MRKDWN: 'mrkdwn',
} as const;
export type TextTypeValue = (typeof TextType)[keyof typeof TextType];

// ─── Core Interfaces ─────────────────────────────────────────────────────────

export interface Typeable {
    readonly type: string;
}

export interface Surfaceable {
    getValidSurfaces(): SurfaceType[];
}

export interface BlockInterface extends Typeable, Surfaceable {
    blockId?: string;
    toJSON(): Record<string, unknown>;
}

export interface ElementInterface extends Typeable {
    getValidBlocks(): BlockTypeValue[];
    toJSON(): Record<string, unknown>;
}

export interface MessageInterface {
    readonly maxBlocks: number;
    channel?: string;
    text?: string;
    threadTs?: string;
    addBlock(block: BlockInterface): void;
    getBlocks(): BlockInterface[];
    toJSON(): Record<string, unknown>;
}
