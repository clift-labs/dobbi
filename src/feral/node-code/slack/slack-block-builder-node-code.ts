// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — SlackBlockBuilder NodeCode
// ─────────────────────────────────────────────────────────────────────────────

import { AbstractNodeCode } from '../../node-code/abstract-node-code.js';
import { NodeCodeCategory } from '../../node-code/node-code.js';
import type { ConfigurationDescription } from '../../configuration/configuration-description.js';
import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import { BlockBuilder } from '../../slack/block-builder.js';
import { Surface, type SurfaceType, type StyleValue } from '../../slack/types.js';

const BUILDER_CONTEXT_KEY = '__slack_block_builder';

/**
 * NodeCode that delegates to BlockBuilder functions.
 * The `function` config parameter determines which builder method to call:
 * init, add-text, add-button, add-checkbox, add-image, add-datepicker, add-input, build.
 *
 * The builder instance is stored in context between calls.
 */
export class SlackBlockBuilderNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        { key: 'function', name: 'Function', description: 'Builder function to call', type: 'string' },
        { key: 'options', name: 'Options', description: 'Static options for the builder function (JSON)', type: 'string', isOptional: true },
        { key: 'context_options', name: 'Context Options Path', description: 'Context path for dynamic options', type: 'string', isOptional: true },
        { key: 'builder_context_path', name: 'Builder Path', description: 'Context path where the builder is stored', type: 'string', isOptional: true, default: BUILDER_CONTEXT_KEY },
        { key: 'block_context_path', name: 'Block Path', description: 'Context path to store the built block', type: 'string', isOptional: true, default: 'slack_block' },
    ];

    constructor() {
        super(
            'slack_section_block_builder',
            'Slack Block Builder',
            'Builds Slack Block Kit blocks using a fluent builder pattern',
            NodeCodeCategory.DATA,
        );
    }

    async process(context: Context): Promise<Result> {
        const fn = this.getRequiredConfigValue('function') as string;
        const builderPath = this.getOptionalConfigValue('builder_context_path', BUILDER_CONTEXT_KEY) as string;
        const blockPath = this.getOptionalConfigValue('block_context_path', 'slack_block') as string;

        // Merge static options + dynamic context_options
        const staticOptions = this.getOptionalConfigValue('options') as Record<string, unknown> | null;
        const contextOptionsPath = this.getOptionalConfigValue('context_options') as string | null;
        const contextOptions = contextOptionsPath && context.has(contextOptionsPath)
            ? context.get(contextOptionsPath) as Record<string, unknown>
            : {};

        const opts = { ...staticOptions, ...contextOptions };

        try {
            switch (fn) {
                case 'init': {
                    const surface = (opts.surface as SurfaceType) ?? Surface.MESSAGE;
                    const builder = new BlockBuilder();
                    builder.initAsSectionForSurface(surface);
                    context.set(builderPath, builder);
                    return this.result(ResultStatus.OK, `Initialized block builder for surface ${surface}`);
                }
                case 'add-text': {
                    const builder = this.getBuilder(context, builderPath);
                    builder.addText(
                        opts.label as string ?? '',
                        opts.type as string,
                        opts.emoji as boolean | undefined,
                        opts.verbatim as boolean | undefined,
                    );
                    return this.result(ResultStatus.OK, 'Added text to block');
                }
                case 'add-button': {
                    const builder = this.getBuilder(context, builderPath);
                    builder.addButton(
                        opts.action_id as string ?? 'button',
                        opts.label as string ?? 'Button',
                        opts.url as string,
                        opts.value as string,
                        opts.style as StyleValue,
                    );
                    return this.result(ResultStatus.OK, 'Added button to block');
                }
                case 'add-checkbox': {
                    const builder = this.getBuilder(context, builderPath);
                    builder.addCheckbox(
                        opts.action_id as string ?? 'checkbox',
                        opts.choices as Record<string, string> ?? {},
                        opts.chosen as string[],
                    );
                    return this.result(ResultStatus.OK, 'Added checkbox to block');
                }
                case 'add-image': {
                    const builder = this.getBuilder(context, builderPath);
                    builder.addImage(opts.url as string ?? '', opts.alt as string);
                    return this.result(ResultStatus.OK, 'Added image to block');
                }
                case 'add-datepicker': {
                    const builder = this.getBuilder(context, builderPath);
                    builder.addDatePicker(
                        opts.action_id as string ?? 'datepicker',
                        opts.text as string,
                        opts.date as string,
                    );
                    return this.result(ResultStatus.OK, 'Added date picker to block');
                }
                case 'add-input': {
                    const builder = this.getBuilder(context, builderPath);
                    builder.addPlainTextInput(
                        opts.action_id as string ?? 'input',
                        opts.text as string,
                        opts.value as string,
                        opts.multiline as boolean,
                        opts.min_length as number,
                        opts.max_length as number,
                    );
                    return this.result(ResultStatus.OK, 'Added plain text input to block');
                }
                case 'build': {
                    const builder = this.getBuilder(context, builderPath);
                    const block = builder.build();
                    context.set(blockPath, block.toJSON());
                    return this.result(ResultStatus.OK, 'Block built successfully');
                }
                default:
                    return this.result(ResultStatus.ERROR, `Unknown block builder function: ${fn}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `BlockBuilder error: ${message}`);
        }
    }

    private getBuilder(context: Context, path: string): BlockBuilder {
        if (!context.has(path)) {
            throw new Error('No block builder found in context. Call "init" first.');
        }
        return context.get(path) as BlockBuilder;
    }
}
