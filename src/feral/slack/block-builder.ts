// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Block Builder
// ─────────────────────────────────────────────────────────────────────────────

import { BlockType, Surface, TextType, type BlockInterface, type ElementInterface, type SurfaceType, type StyleValue } from './types.js';
import { Text, Option } from './composition.js';
import { Section, Actions, ContextBlock, Divider, FileBlock, ImageBlock, InputBlock } from './blocks.js';
import { Button, Checkbox, DatePicker, ImageElement, PlainTextInput } from './elements.js';
import { MappingFactory } from './mapping-factory.js';

/**
 * Fluent builder for constructing Slack Block Kit structures.
 * Delegates to MappingFactory for block/element instantiation.
 */
export class BlockBuilder {
    private blockFactory: MappingFactory<BlockInterface>;
    private currentBlock?: BlockInterface;
    private currentSurface?: SurfaceType;

    constructor(blockFactory?: MappingFactory<BlockInterface>) {
        this.blockFactory = blockFactory ?? createDefaultBlockFactory();
    }

    /**
     * Initialize with a Section block for the given surface.
     */
    initAsSectionForSurface(surface: SurfaceType = Surface.MESSAGE): this {
        const section = new Section();
        this.validateSurfaceForBlock(section, surface);
        this.currentBlock = section;
        this.currentSurface = surface;
        return this;
    }

    /**
     * Initialize with a block of the given type for the given surface.
     */
    initWithTypeForSurface(type: string, surface: SurfaceType = Surface.MESSAGE): this {
        const block = this.blockFactory.build(type);
        this.validateSurfaceForBlock(block, surface);
        this.currentBlock = block;
        this.currentSurface = surface;
        return this;
    }

    /**
     * Initialize with a pre-made block for the given surface.
     */
    initWithBlockForSurface(block: BlockInterface, surface: SurfaceType = Surface.MESSAGE): this {
        this.validateSurfaceForBlock(block, surface);
        this.currentBlock = block;
        this.currentSurface = surface;
        return this;
    }

    /**
     * Add text to the current block (Section text or Context element).
     */
    addText(
        label: string,
        type: string = TextType.MRKDWN,
        emoji?: boolean,
        verbatim?: boolean,
    ): this {
        this.ensureBlock();
        const text = new Text(label, type as 'plain_text' | 'mrkdwn');
        if (emoji !== undefined) text.emoji = emoji;
        if (verbatim !== undefined) text.verbatim = verbatim;

        const block = this.currentBlock!;
        if (block instanceof Section) {
            block.text = text;
        } else if (block instanceof ContextBlock) {
            block.addElement(text);
        }
        return this;
    }

    /**
     * Add a button element.
     */
    addButton(
        actionId: string,
        label: string,
        url?: string,
        value?: string,
        style?: StyleValue,
    ): this {
        this.ensureBlock();
        const text = new Text(label, TextType.PLAIN_TEXT);
        const button = new Button(actionId, text);
        if (url) button.url = url;
        if (value) button.value = value;
        if (style) button.style = style;

        this.validateElementForBlock(button);
        this.addElementToBlock(button);
        return this;
    }

    /**
     * Add a checkbox group element.
     */
    addCheckbox(
        actionId: string,
        choices: Record<string, string>,
        chosen?: string[],
    ): this {
        this.ensureBlock();
        const checkbox = new Checkbox(actionId);

        for (const [key, label] of Object.entries(choices)) {
            const option = new Option(new Text(label, TextType.PLAIN_TEXT), key);
            checkbox.options.push(option);
        }

        if (chosen) {
            checkbox.initialOptions = checkbox.options.filter(o => chosen.includes(o.value));
        }

        this.validateElementForBlock(checkbox);
        this.addElementToBlock(checkbox);
        return this;
    }

    /**
     * Add an image element.
     */
    addImage(imageUrl: string, altText: string = ''): this {
        this.ensureBlock();
        const image = new ImageElement(imageUrl, altText);
        this.validateElementForBlock(image);
        this.addElementToBlock(image);
        return this;
    }

    /**
     * Add a date picker element.
     */
    addDatePicker(
        actionId: string,
        text?: string,
        date?: string,
    ): this {
        this.ensureBlock();
        const picker = new DatePicker(actionId);
        if (text) picker.placeholder = new Text(text, TextType.PLAIN_TEXT);
        if (date) picker.initialDate = date;

        this.validateElementForBlock(picker);
        this.addElementToBlock(picker);
        return this;
    }

    /**
     * Add a plain text input element.
     */
    addPlainTextInput(
        actionId: string,
        text?: string,
        value?: string,
        multiline?: boolean,
        minLength?: number,
        maxLength?: number,
    ): this {
        this.ensureBlock();
        const input = new PlainTextInput(actionId);
        if (text) input.placeholder = new Text(text, TextType.PLAIN_TEXT);
        if (value) input.initialValue = value;
        if (multiline !== undefined) input.multiline = multiline;
        if (minLength !== undefined) input.minLength = minLength;
        if (maxLength !== undefined) input.maxLength = maxLength;

        this.validateElementForBlock(input);
        this.addElementToBlock(input);
        return this;
    }

    /**
     * Finalize and return the built block.
     */
    build(): BlockInterface {
        this.ensureBlock();
        const block = this.currentBlock!;
        this.currentBlock = undefined;
        this.currentSurface = undefined;
        return block;
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private ensureBlock(): void {
        if (!this.currentBlock) {
            throw new Error('BlockBuilder: no block initialized. Call init* first.');
        }
    }

    private validateSurfaceForBlock(block: BlockInterface, surface: SurfaceType): void {
        const validSurfaces = block.getValidSurfaces();
        if (!validSurfaces.includes(surface)) {
            throw new Error(
                `Block type "${block.type}" is not valid for surface "${surface}". ` +
                `Valid surfaces: ${validSurfaces.join(', ')}`,
            );
        }
    }

    private validateElementForBlock(element: ElementInterface): void {
        const block = this.currentBlock!;
        const validBlocks = element.getValidBlocks();
        if (!validBlocks.includes(block.type as any)) {
            throw new Error(
                `Element type "${element.type}" is not valid for block type "${block.type}". ` +
                `Valid blocks: ${validBlocks.join(', ')}`,
            );
        }
    }

    private addElementToBlock(element: ElementInterface): void {
        const block = this.currentBlock!;
        if (block instanceof Section) {
            block.accessory = element;
        } else if (block instanceof Actions) {
            block.addElement(element);
        } else if (block instanceof ContextBlock) {
            block.addElement(element);
        } else if (block instanceof InputBlock) {
            block.element = element;
        }
    }
}

/**
 * Creates the default block factory with all standard block types.
 */
export function createDefaultBlockFactory(): MappingFactory<BlockInterface> {
    return new MappingFactory<BlockInterface>({
        [BlockType.SECTION]: Section as unknown as new () => BlockInterface,
        [BlockType.ACTIONS]: Actions as unknown as new () => BlockInterface,
        [BlockType.CONTEXT]: ContextBlock as unknown as new () => BlockInterface,
        [BlockType.DIVIDER]: Divider as unknown as new () => BlockInterface,
        [BlockType.IMAGE]: ImageBlock as unknown as new () => BlockInterface,
        [BlockType.INPUT]: InputBlock as unknown as new () => BlockInterface,
    });
}
