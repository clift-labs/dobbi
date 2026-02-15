// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Bootstrap
// ─────────────────────────────────────────────────────────────────────────────
//
// Wires the full Feral runtime from configuration.
// Call bootstrapFeral() once at service/CLI startup.
// ─────────────────────────────────────────────────────────────────────────────

import path from 'path';
import os from 'os';

import { NodeCodeFactory } from './node-code/node-code-factory.js';
import type { NodeCode } from './node-code/node-code.js';
import { Catalog } from './catalog/catalog.js';
import { BuiltInCatalogSource } from './catalog/built-in-catalog-source.js';
import { JsonCatalogSource } from './catalog/json-catalog-source.js';
import { loadFeralCatalogConfig } from './catalog/feral-catalog-config.js';
import { EventDispatcher } from './events/event-dispatcher.js';
import { ProcessEngine } from './engine/process-engine.js';
import { ProcessFactory } from './process/process-factory.js';
import { Runner } from './runner/runner.js';
import type { ProcessSource } from './process/process-factory.js';

// Built-in node codes
import { StartNodeCode } from './node-code/flow/start-node-code.js';
import { StopNodeCode } from './node-code/flow/stop-node-code.js';
import { NoopNodeCode } from './node-code/flow/noop-node-code.js';
import { ComparatorNodeCode } from './node-code/flow/comparator-node-code.js';
import { ContextValueResultNodeCode } from './node-code/flow/context-value-result-node-code.js';
import { ThrowExceptionNodeCode } from './node-code/flow/throw-exception-node-code.js';
import { SetContextValueNodeCode } from './node-code/data/set-context-value-node-code.js';
import { SetContextTableNodeCode } from './node-code/data/set-context-table-node-code.js';
import { CalculationNodeCode } from './node-code/data/calculation-node-code.js';
import { CounterNodeCode } from './node-code/data/counter-node-code.js';
import { HttpNodeCode } from './node-code/data/http-node-code.js';
import { JsonDecodeNodeCode } from './node-code/data/json-decode-node-code.js';
import { JsonEncodeNodeCode } from './node-code/data/json-encode-node-code.js';
import { LogNodeCode } from './node-code/data/log-node-code.js';
import { RandomValueNodeCode } from './node-code/data/random-value-node-code.js';
import { ReadFileNodeCode } from './node-code/data/read-file-node-code.js';
import { LlmChatNodeCode } from './node-code/data/llm-chat-node-code.js';

// Slack node codes
import { SlackBlockBuilderNodeCode } from './node-code/slack/slack-block-builder-node-code.js';
import { SlackPostWebhookNodeCode } from './node-code/slack/slack-post-webhook-node-code.js';
import { SlackProcessSlashCommandNodeCode } from './node-code/slack/slack-process-slash-command-node-code.js';

// Agent / GenAI node codes
import { MergeStringsNodeCode } from './node-code/genai/merge-strings-node-code.js';
import { DataSynthesisPrepNodeCode } from './node-code/genai/data-synthesis-prep-node-code.js';
import { WriteFileNodeCode } from './node-code/genai/write-file-node-code.js';
import { GenerateMarkdownNodeCode } from './node-code/genai/generate-markdown-node-code.js';
import { GenerateHtmlNodeCode } from './node-code/genai/generate-html-node-code.js';
import { WriteEntityNodeCode } from './node-code/genai/write-entity-node-code.js';
import { WriteToRedisNodeCode } from './node-code/genai/write-to-redis-node-code.js';
import { OpenAiNodeCode } from './node-code/genai/openai-node-code.js';
import { ModelToOutputNodeCode } from './node-code/genai/model-to-output-node-code.js';
import { HydrateModelNodeCode } from './node-code/genai/hydrate-model-node-code.js';

// Entity node codes
import { ListEntitiesNodeCode } from './node-code/entity/list-entities-node-code.js';
import { FindEntityNodeCode } from './node-code/entity/find-entity-node-code.js';
import { CreateEntityNodeCode } from './node-code/entity/create-entity-node-code.js';
import { UpdateEntityNodeCode } from './node-code/entity/update-entity-node-code.js';
import { DeleteEntityNodeCode } from './node-code/entity/delete-entity-node-code.js';
import { SortEntitiesNodeCode } from './node-code/entity/sort-entities-node-code.js';

// Catalog sources
import { SlackCatalogSource } from './catalog/slack-catalog-source.js';
import { AgentCatalogSource } from './catalog/agent-catalog-source.js';
import { EntityCatalogSource } from './catalog/entity-catalog-source.js';

// Process sources
import { JsonProcessSource } from './process/json-process-source.js';

/**
 * All built-in NodeCode instances.
 */
function getBuiltInNodeCodes(): NodeCode[] {
    return [
        // Flow
        new StartNodeCode(),
        new StopNodeCode(),
        new NoopNodeCode(),
        new ComparatorNodeCode(),
        new ContextValueResultNodeCode(),
        new ThrowExceptionNodeCode(),
        // Data
        new SetContextValueNodeCode(),
        new SetContextTableNodeCode(),
        new CalculationNodeCode(),
        new CounterNodeCode(),
        new HttpNodeCode(),
        new JsonDecodeNodeCode(),
        new JsonEncodeNodeCode(),
        new LogNodeCode(),
        new RandomValueNodeCode(),
        new ReadFileNodeCode(),
        new LlmChatNodeCode(),
        // Slack
        new SlackBlockBuilderNodeCode(),
        new SlackPostWebhookNodeCode(),
        new SlackProcessSlashCommandNodeCode(),
        // Agent / GenAI
        new MergeStringsNodeCode(),
        new DataSynthesisPrepNodeCode(),
        new WriteFileNodeCode(),
        new GenerateMarkdownNodeCode(),
        new GenerateHtmlNodeCode(),
        new WriteEntityNodeCode(),
        new WriteToRedisNodeCode(),
        new OpenAiNodeCode(),
        new ModelToOutputNodeCode(),
        new HydrateModelNodeCode(),
        // Entity
        new ListEntitiesNodeCode(),
        new FindEntityNodeCode(),
        new CreateEntityNodeCode(),
        new UpdateEntityNodeCode(),
        new DeleteEntityNodeCode(),
        new SortEntitiesNodeCode(),
    ];
}

/**
 * The assembled Feral runtime, ready to execute processes.
 */
export interface FeralRuntime {
    readonly nodeCodeFactory: NodeCodeFactory;
    readonly catalog: Catalog;
    readonly eventDispatcher: EventDispatcher;
    readonly engine: ProcessEngine;
    readonly processFactory: ProcessFactory;
    readonly runner: Runner;
}

/**
 * Bootstrap the full Feral runtime:
 * 1. Creates NodeCodeFactory with all built-in node codes
 * 2. Loads user-defined catalog config from ~/.dobbie/feral-catalog.json
 * 3. Builds Catalog from built-in + user-defined sources
 * 4. Wires EventDispatcher, ProcessEngine, ProcessFactory, Runner
 */
export async function bootstrapFeral(
    processSources: ProcessSource[] = [],
): Promise<FeralRuntime> {
    // 1. NodeCode factory
    const nodeCodeFactory = new NodeCodeFactory([
        { getNodeCodes: () => getBuiltInNodeCodes() },
    ]);

    // 2. Load catalog config
    const catalogConfig = await loadFeralCatalogConfig();

    // 3. Build catalog from both sources
    const catalog = new Catalog([
        new BuiltInCatalogSource(nodeCodeFactory),
        new JsonCatalogSource(catalogConfig),
        new SlackCatalogSource(),
        new AgentCatalogSource(),
        new EntityCatalogSource(),
    ]);

    // 4. Load process definitions from ~/.dobbie/processes/
    const processDir = path.join(os.homedir(), '.dobbie', 'processes');
    const jsonProcessSource = new JsonProcessSource(processDir);
    await jsonProcessSource.load();

    // 5. Wire engine
    const eventDispatcher = new EventDispatcher();
    const engine = new ProcessEngine(eventDispatcher, catalog, nodeCodeFactory);
    const processFactory = new ProcessFactory([jsonProcessSource, ...processSources]);
    const runner = new Runner(processFactory, engine);

    return {
        nodeCodeFactory,
        catalog,
        eventDispatcher,
        engine,
        processFactory,
        runner,
    };
}
