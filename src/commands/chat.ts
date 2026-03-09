// ─────────────────────────────────────────────────────────────────────────────
// Feral Autonomous Chat
// ─────────────────────────────────────────────────────────────────────────────
//
// When the user types 3+ words that don't match a known command, Dobbi
// "thinks for himself" — a 3-step LLM pipeline that:
//   1. Selects catalog nodes relevant to the user's request
//   2. Generates a Feral process JSON using those nodes
//   3. Runs the process, then synthesizes a natural response
// ─────────────────────────────────────────────────────────────────────────────

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { bootstrapFeral } from '../feral/bootstrap.js';
import { hydrateProcessFromString } from '../feral/process/process-json-hydrator.js';
import type { ProcessSource } from '../feral/process/process-factory.js';
import type { Process } from '../feral/process/process.js';
import { getModelForCapability, createDobbiSystemPrompt } from '../llm/router.js';
import { debug } from '../utils/debug.js';
import { ChatLogger, generateChatId } from '../utils/chat-logger.js';
import { loadEntityTypes } from '../entities/entity-type-config.js';
import { getActiveProject, getUserName } from '../state/manager.js';
import { getProjectContext } from '../context/reader.js';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY PROCESS SOURCE
// ─────────────────────────────────────────────────────────────────────────────

class InMemoryProcessSource implements ProcessSource {
    private processes: Process[] = [];

    add(process: Process): void {
        this.processes.push(process);
    }

    getProcesses(): Process[] {
        return this.processes;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLE PROCESSES (for the LLM prompt)
// ─────────────────────────────────────────────────────────────────────────────

const EXAMPLE_PROCESSES = [
    {
        description: 'Simple linear process: list tasks then sort them',
        json: {
            schema_version: 1,
            key: 'tasks.list',
            description: 'List all tasks, sorted by priority and due date',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'list' } },
                { key: 'list', catalog_node_key: 'list_tasks', configuration: {}, edges: { ok: 'sort' } },
                { key: 'sort', catalog_node_key: 'sort_tasks', configuration: {}, edges: { ok: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'Create multiple entities: a goal and a todont from user input',
        json: {
            schema_version: 1,
            key: 'multi.create',
            description: 'Create a goal and a todont based on user input',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'create_goal' } },
                { key: 'create_goal', catalog_node_key: 'create_goal', configuration: { entity_title: 'Run 10 miles', entity_body: 'Train progressively to run 10 miles by mid-March' }, edges: { ok: 'create_todont', already_exists: 'create_todont', error: 'create_todont' } },
                { key: 'create_todont', catalog_node_key: 'create_todont', configuration: { entity_title: 'No pizza or beer', entity_body: 'Avoid pizza and beer while training for the 10-mile run' }, edges: { ok: 'done', already_exists: 'done', error: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'If/else branch: find a task, check its priority, and take different actions based on whether it is high priority',
        json: {
            schema_version: 1,
            key: 'task.priority.check',
            description: 'Find a task by title, then branch on its priority — set high-priority tasks to in-progress, leave others as-is',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'find' } },
                { key: 'find', catalog_node_key: 'find_task', configuration: {}, edges: { ok: 'check_priority', error: 'done' } },
                { key: 'check_priority', catalog_node_key: 'context_value_comparator', configuration: { left_context_path: 'priority', right_value: 'high' }, edges: { true: 'set_in_progress', false: 'done' } },
                { key: 'set_in_progress', catalog_node_key: 'set_task_status', configuration: { value: 'in-progress' }, edges: { ok: 'done', error: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'Tag filter: list only tasks that have a specific tag',
        json: {
            schema_version: 1,
            key: 'tasks.by_tag',
            description: 'List all tasks with the "home" tag',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'list' } },
                { key: 'list', catalog_node_key: 'list_tasks', configuration: { tags: 'home' }, edges: { ok: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'Complete a task: find it by title and mark it as done',
        json: {
            schema_version: 1,
            key: 'task.complete',
            description: 'Mark a task as done',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'complete' } },
                { key: 'complete', catalog_node_key: 'complete_task', configuration: { entity_title: 'Buy groceries' }, edges: { ok: 'done', not_found: 'done', error: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'Link two entities: connect a task to a goal',
        json: {
            schema_version: 1,
            key: 'link.task_to_goal',
            description: 'Link a task to a related goal',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'link' } },
                { key: 'link', catalog_node_key: 'link_entities', configuration: { source_entity_type: 'task', source_entity_title: 'Fix the fence', target_entity_type: 'goal', target_entity_title: 'Home improvement', label: 'contributes-to' }, edges: { ok: 'done', not_found: 'done', error: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'Create a new content type for something Dobbi doesn\'t track yet',
        json: {
            schema_version: 1,
            key: 'type.create',
            description: 'Create a recipe content type',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'create_type' } },
                { key: 'create_type', catalog_node_key: 'create_content_type', configuration: { type_name: 'recipe', description: 'A cooking recipe with ingredients, instructions, prep time, and servings' }, edges: { ok: 'done', already_exists: 'done', error: 'done' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
    {
        description: 'While loop: list tasks, iterate over each one, and use LLM to add a summary to each task body',
        json: {
            schema_version: 1,
            key: 'tasks.summarize',
            description: 'Loop through all tasks and ask the LLM to generate a one-line summary for each',
            context: {},
            nodes: [
                { key: 'start', catalog_node_key: 'start', configuration: {}, edges: { ok: 'list' } },
                { key: 'list', catalog_node_key: 'list_tasks', configuration: {}, edges: { ok: 'iterate' } },
                { key: 'iterate', catalog_node_key: 'array_iterator', configuration: { source_context_path: 'entities', cursor_context_path: '_cursor', spread_fields: 'true' }, edges: { ok: 'summarize', done: 'done' } },
                { key: 'summarize', catalog_node_key: 'llm_chat', configuration: { capability: 'summarize', prompt: 'Write a one-line summary for a task titled "{title}".', response_context_path: 'summary' }, edges: { ok: 'iterate', error: 'iterate' } },
                { key: 'done', catalog_node_key: 'stop', configuration: {}, edges: {} },
            ],
        },
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// CORE: feralChatHeadless — headless pipeline, returns the response string
// ─────────────────────────────────────────────────────────────────────────────

export async function feralChatHeadless(
    userInput: string,
    onStatus?: (status: string) => void,
    onProcess?: (processJson: Record<string, unknown>) => void,
    onQuestion?: (question: string, options?: string[]) => Promise<string>,
    onChatId?: (chatId: string) => void,
): Promise<string> {
    const status = (s: string) => onStatus?.(s);
    const chatId = generateChatId();
    const logger = new ChatLogger(chatId);

    // Fire the chat ID callback immediately so callers can display/send it
    onChatId?.(chatId);

    status('Dobbi is thinking…');

    try { return await _feralChatHeadlessInner(userInput, status, onProcess, onQuestion, logger, chatId); }
    catch (error) {
        await logger.log('error', { message: error instanceof Error ? error.message : String(error) });
        throw error;
    } finally {
        logger.close();
    }
}

async function _feralChatHeadlessInner(
    userInput: string,
    status: (s: string) => void,
    onProcess: ((processJson: Record<string, unknown>) => void) | undefined,
    onQuestion: ((question: string, options?: string[]) => Promise<string>) | undefined,
    logger: ChatLogger,
    chatId: string,
): Promise<string> {
    // ── Bootstrap Feral + load entity types + vault context ────────
    const inMemorySource = new InMemoryProcessSource();
    const [runtime, entityTypes, activeProject, userName] = await Promise.all([
        bootstrapFeral([inMemorySource]),
        loadEntityTypes().catch(() => []),
        getActiveProject().catch(() => null),
        getUserName().catch(() => 'friend'),
    ]);

    await logger.log('start', { chatId, userInput, activeProject });

    // Load project vault context (.socks.md chain) if a project is active
    // Scrub any secrets that may have been accidentally pasted into .socks.md files
    const vaultContext = activeProject
        ? scrubSecrets(await getProjectContext(activeProject).catch(() => '')) as string
        : '';

    // Build global variables block for the LLM
    const today = new Date().toISOString().split('T')[0];
    const globalsBlock = [
        `- user_name: ${userName}`,
        `- current_date: ${today}`,
        activeProject ? `- active_project: ${activeProject}` : null,
    ].filter(Boolean).join('\n');

    const allNodes = runtime.catalog.getAllCatalogNodes();

    // Build catalog summary for LLM
    const catalogSummary = allNodes
        .filter(n => !n.key.startsWith('speak_'))  // skip output variants
        .map(n => `- ${n.key}: ${n.description || n.name} [group: ${n.group}]`)
        .join('\n');

    debug('chat', `Catalog has ${allNodes.length} nodes, sending ${catalogSummary.split('\n').length} to LLM`);

    // ── STEP 1: Select catalog nodes ─────────────────────────────────
    status('Selecting capabilities…');

    const llm = await getModelForCapability('reason');

    const step1Response = await llm.chat(
        [{
            role: 'user' as const,
            content: `The user said: "${userInput}"

GLOBAL VARIABLES:
${globalsBlock}

${vaultContext ? `VAULT CONTEXT (from .socks.md files — project goals, notes, and preferences):\n${vaultContext}\n` : ''}DOBBI'S ENTITY TYPES:
Dobbi manages these entity types. When the user mentions something that maps to an entity, prefer creating it:
${entityTypes.map(t => {
    const fieldDesc = t.fields.length > 0
        ? ` Fields: ${t.fields.map(f => `${f.key}${f.type === 'enum' && f.values ? ` (${f.values.join('|')})` : ''}`).join(', ')}.`
        : '';
    return `- ${t.name} (plural: ${t.plural})${t.description ? ` — ${t.description}` : ''}.${fieldDesc}`;
}).join('\n')}

Each entity type has create_*, list_*, find_*, update_*, delete_*, complete_* catalog nodes, plus set_${'{type}'}_{field} nodes for each field.
For example: create_task, list_tasks, find_note, set_task_status, complete_task, etc.

IMPORTANT CAPABILITIES:
- To filter entities by tag, use the "tags" config on list_* or search_* nodes (comma-separated tag names).
- To mark an entity as done/complete, use the complete_* node (e.g. complete_task).
- To create a NEW content type the user mentions (e.g. "recipe", "habit", "bookmark"), use "create_content_type".
- To link two entities together (e.g. a task relates to a goal), use "link_entities".
- To add tags to an existing entity, use the add_tag_* nodes (e.g. add_tag_task).

When the user's request implies creating entities, ALWAYS select the appropriate create_* nodes.
When the user mentions multiple entities, select multiple create_* nodes.
When the user refers to a content type that doesn't exist yet, select "create_content_type".

Here are all available catalog nodes in the Feral process engine. Each node performs a specific action:

${catalogSummary}

IMPORTANT RULES:
- Every process MUST start with "start" and end with "stop"
- Always include "start" and "stop" in your selection
- The "llm_chat" node sends a prompt to an LLM. It supports {context_key} interpolation in prompts
- Only select nodes that are directly useful for fulfilling the user's request
- Prefer entity nodes (list_*, find_*, create_*, complete_*) for data operations
- Prefer system nodes (get_time, get_date, etc.) for system information
- When the user wants to CREATE something, use the create_* nodes — don't just use llm_chat to give advice
- When the user wants to mark something as done/complete, use complete_* nodes (e.g. complete_task)
- When the user asks about entities by tag, use list_* or search_* with the "tags" config
- When the user mentions a content type that doesn't exist, select "create_content_type"
- When the user wants to relate or connect entities, select "link_entities"

Return a JSON object with this exact structure:
{
    "reasoning": "Why these nodes were selected",
    "nodes": ["start", "stop", "node_key_1", "node_key_2"]
}

Return ONLY the JSON object, no markdown fences.`,
        }],
        {
            systemPrompt: 'You are a process designer for the Feral CCF system. Select the minimal set of catalog nodes needed to fulfill the user\'s request. Always include "start" and "stop". Be precise and concise.',
            temperature: 0.3,
        },
    );

    debug('chat', `Step 1 response: ${step1Response}`);

    let nodeSelection: { reasoning: string; nodes: string[] };
    try {
        nodeSelection = parseJsonResponse(step1Response) as { reasoning: string; nodes: string[] };
    } catch (err) {
        debug('chat', `Step 1 raw response: ${step1Response}`);
        throw new Error(`Failed to parse node selection from LLM: ${err instanceof Error ? err.message : err}`);
    }

    await logger.log('node_selection', { reasoning: nodeSelection.reasoning, nodes: nodeSelection.nodes });

    // Ensure start/stop are included
    if (!nodeSelection.nodes.includes('start')) nodeSelection.nodes.unshift('start');
    if (!nodeSelection.nodes.includes('stop')) nodeSelection.nodes.push('stop');

    // Gather selected node details + their config descriptions
    const selectedNodes = nodeSelection.nodes
        .map(key => {
            try {
                return runtime.catalog.getCatalogNode(key);
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    const selectedNodeDetails = selectedNodes
        .map(n => {
            const config = Object.keys(n!.configuration).length > 0
                ? `  config: ${JSON.stringify(n!.configuration)}`
                : '';
            return `- ${n!.key} (${n!.group}): ${n!.description || n!.name}${config}`;
        })
        .join('\n');

    // Get config descriptions for the selected node codes
    const nodeCodeDetails: string[] = [];
    for (const n of selectedNodes) {
        if (!n) continue;
        try {
            const nodeCode = runtime.nodeCodeFactory.getNodeCode(n.nodeCodeKey);
            const Ctor = nodeCode.constructor as { configDescriptions?: Array<{ key: string; name: string; description: string; type: string; default?: unknown; isOptional?: boolean; isSecret?: boolean }> };
            const Ctor2 = nodeCode.constructor as { resultDescriptions?: Array<{ status: string; description: string }> };
            // Filter out secret config keys — they should never appear in LLM prompts
            const configs = (Ctor.configDescriptions ?? []).filter(c => !c.isSecret);
            const results = Ctor2.resultDescriptions ?? [];
            if (configs.length > 0 || results.length > 0) {
                const configStr = configs.map(c =>
                    `    - ${c.key} (${c.type}${c.isOptional ? ', optional' : ''}${c.default != null ? `, default: ${JSON.stringify(c.default)}` : ''}): ${c.description}`
                ).join('\n');
                const resultStr = results.map(r => `    → "${r.status}": ${r.description}`).join('\n');
                nodeCodeDetails.push(`${n.key} (nodeCode: ${n.nodeCodeKey}):\n  Configuration:\n${configStr}\n  Results (edge keys):\n${resultStr}`);
            }
        } catch {
            // Skip if node code not found
        }
    }

    // ── STEP 1.5: Information gathering (skipped in headless mode) ──
    // In headless mode we don't prompt for follow-ups — proceed with what we have
    const gatheredInfoStr = '';

    // ── ORCHESTRATION LOOP ────────────────────────────────────────────
    // Iteratively: generate process → run → check completion → repeat
    const MAX_ITERATIONS = 3;
    const allResults: Record<string, unknown>[] = [];
    const allReasonings: string[] = [];
    let remainingWork = userInput;

    const examplesStr = EXAMPLE_PROCESSES.map((ex, i) =>
        `Example ${i + 1}: ${ex.description}\n${JSON.stringify(ex.json, null, 2)}`
    ).join('\n\n');

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        // ── STEP 2: Generate process ─────────────────────────────────
        status(`Designing process${iteration > 0 ? ` (step ${iteration + 1})` : ''}…`);

        const previousResultsStr = allResults.length > 0
            ? `\n\nRESULTS FROM PREVIOUS STEPS:\n${JSON.stringify(allResults, null, 2)}`
            : '';

        const step2Response = await llm.chat(
            [{
                role: 'user' as const,
                content: `Build a Feral process to handle: "${remainingWork}"
${gatheredInfoStr}${previousResultsStr}

GLOBAL VARIABLES:
${globalsBlock}

${vaultContext ? `VAULT CONTEXT (from .socks.md files — project goals, notes, and preferences):\n${vaultContext}\n` : ''}SELECTED CATALOG NODES (you must only use nodes from this list):
${selectedNodeDetails}

NODE CONFIGURATION DETAILS:
${nodeCodeDetails.join('\n\n')}

PROCESS FORMAT RULES:
1. schema_version MUST be 1
2. key should be "chat.generated"
3. First node MUST have key "start" with catalog_node_key "start"
4. Last node MUST have key "done" with catalog_node_key "stop" and empty edges {}
5. "edges" maps result status strings to the next node key
6. Most nodes produce "ok" and "error" results
7. Use {context_key} syntax in configuration values to interpolate context values
8. The context starts with: user_input = "${userInput}"
9. Keep the process as simple as possible — prefer fewer nodes
10. For entity creation, ALWAYS set entity_title and entity_body in the configuration with concrete values
11. Use the vault context to inform entity content — respect project goals and conventions
12. To filter by tag, set "tags" in configuration (comma-separated), e.g. { "tags": "year-of-the-house" }
13. To link entities, use link_entities with source_entity_type, source_entity_title, target_entity_type, target_entity_title, and label
14. To complete/finish an entity, use the complete_* catalog node (e.g. complete_task)
15. ONLY use configuration keys that appear in the NODE CONFIGURATION DETAILS above — do not invent keys

EXAMPLE PROCESSES:
${examplesStr}

Return a JSON object with this exact structure:
{
    "reasoning": "One short sentence",
    "process": { ... the process JSON ... }
}

IMPORTANT: Keep "reasoning" to ONE sentence. The process JSON is what matters.

Return ONLY the JSON object, no markdown fences.`,
            }],
            {
                systemPrompt: 'You are a process designer for the Feral CCF engine. Generate a valid process JSON that solves the user\'s request using the provided catalog nodes. The process will be executed immediately by the Feral engine. Be precise with catalog_node_key values — they must match exactly.',
                temperature: 0.3,
                maxTokens: 32768,
            },
        );

        debug('chat', `Step 2 response (iteration ${iteration + 1}): ${step2Response}`);

        let processDesign: { reasoning: string; process: Record<string, unknown> };
        try {
            processDesign = parseJsonResponse(step2Response) as { reasoning: string; process: Record<string, unknown> };
        } catch (err) {
            debug('chat', `Step 2 raw response: ${step2Response}`);
            throw new Error(`Failed to parse process design from LLM: ${err instanceof Error ? err.message : err}`);
        }

        allReasonings.push(processDesign.reasoning);

        await logger.log('process_design', { iteration: iteration + 1, reasoning: processDesign.reasoning, process: processDesign.process });

        // Emit process JSON for visualization
        onProcess?.(processDesign.process);

        // ── STEP 3: Execute the generated process ────────────────────
        status(`Running process${iteration > 0 ? ` (step ${iteration + 1})` : ''}…`);

        let processJsonStr: string;
        try {
            processJsonStr = JSON.stringify(processDesign.process);
        } catch {
            throw new Error('Generated process is not valid JSON');
        }

        const process = hydrateProcessFromString(processJsonStr);
        inMemorySource.add(process);

        let contextResult: Record<string, unknown>;
        try {
            const ctx = await runtime.runner.run(process.key, {
                user_input: userInput,
                ...(onQuestion ? { _askQuestion: onQuestion } : {}),
            });
            contextResult = ctx.getAll();
        } catch (error) {
            debug('chat', `Process execution failed: ${error}`);
            contextResult = { _error: error instanceof Error ? error.message : String(error) };
        }

        // Filter internal keys and scrub any secrets from context results
        const iterationResult = Object.entries(contextResult)
            .filter(([k]) => !k.startsWith('_') && k !== 'user_input')
            .reduce((acc, [k, v]) => {
                acc[k] = typeof v === 'string' && v.length > 2000 ? v.slice(0, 2000) + '…' : v;
                return acc;
            }, {} as Record<string, unknown>);

        allResults.push(scrubSecrets(iterationResult) as Record<string, unknown>);

        await logger.log('process_result', { iteration: iteration + 1, results: iterationResult });

        // ── STEP 4: Check completion ──────────────────────────────────
        if (iteration < MAX_ITERATIONS - 1) {
            status('Checking if task is complete…');

            const completionResponse = await llm.chat(
                [{
                    role: 'user' as const,
                    content: `The user originally said: "${userInput}"

We have completed ${iteration + 1} step(s) so far.

Step reasoning: ${allReasonings.join(' → ')}

Results from all steps:
${JSON.stringify(allResults, null, 2)}

Is the user's ENTIRE request fulfilled? Consider:
- Did we create ALL entities the user mentioned?
- Did we perform ALL actions the user asked for?
- Are there remaining items that still need to be done?

Return a JSON object with EXACTLY this structure:
If COMPLETE: { "status": "complete" }
If MORE WORK NEEDED: { "status": "more_work", "remaining": "Description of what still needs to be done" }

Return ONLY the JSON object, no markdown fences.`,
                }],
                {
                    systemPrompt: 'You are a task completion checker. Be thorough — if the user asked for multiple things (e.g., create a goal AND avoid pizza), make sure ALL parts have been addressed.',
                    temperature: 0.2,
                },
            );

            debug('chat', `Completion check (iteration ${iteration + 1}): ${completionResponse}`);

            let completion: { status: string; remaining?: string };
            try {
                completion = parseJsonResponse(completionResponse) as { status: string; remaining?: string };
            } catch {
                debug('chat', 'Could not parse completion response, assuming complete');
                break;
            }

            await logger.log('completion_check', { iteration: iteration + 1, status: completion.status, remaining: completion.remaining || null });

            if (completion.status === 'complete') {
                debug('chat', 'Task complete, exiting orchestration loop');
                break;
            }

            // Update the remaining work for the next iteration
            remainingWork = completion.remaining || userInput;
            debug('chat', `More work needed: ${remainingWork}`);
        }
    }

    // ── STEP 5: Synthesize response ──────────────────────────────────
    status('Composing response…');

    const synthesisPrompt = `You are Dobbi, a helpful personal assistant. The user said: "${userInput}"

To answer, I selected these capabilities:
${nodeSelection.reasoning}

I ran ${allResults.length} process step(s):
${allReasonings.map((r, i) => `Step ${i + 1}: ${r}`).join('\n')}

The process used these catalog nodes:
${selectedNodes.filter(Boolean).map(n => `- ${n!.key}: ${n!.description || n!.name}`).join('\n')}

Here are the results from all process steps:
${JSON.stringify(allResults, null, 2)}

${allResults.some(r => r._error) ? `Note: Some steps encountered errors.` : ''}

Now compose a helpful, natural response to the user. Be concise and friendly. If processes produced data, present it clearly. If there were errors, acknowledge them gracefully and suggest what the user could try instead.`;

    const step5Response = await llm.chat(
        [{ role: 'user' as const, content: synthesisPrompt }],
        {
            systemPrompt: createDobbiSystemPrompt('You are responding to a natural language request from your user. Be helpful, concise, and warm.'),
            temperature: 0.7,
        },
    );

    const finalResponse = step5Response.trim();
    await logger.log('response', { response: finalResponse });
    return finalResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: feralChat — CLI wrapper with ora spinner
// ─────────────────────────────────────────────────────────────────────────────

export async function feralChat(userInput: string): Promise<void> {
    const spinner = ora({ text: chalk.dim('Dobbi is thinking…'), color: 'cyan' }).start();

    try {
        const response = await feralChatHeadless(
            userInput,
            (s) => { spinner.text = chalk.dim(s); },
            undefined,
            undefined,
            (chatId) => { spinner.text = chalk.dim(`[${chatId}] Dobbi is thinking…`); },
        );

        spinner.stop();
        console.log(chalk.cyan(`\n  ${response.split('\n').join('\n  ')}\n`));
    } catch (error) {
        spinner.stop();
        const msg = error instanceof Error ? error.message : String(error);
        debug('chat', `Autonomous chat failed: ${msg}`);
        if (msg.includes('credit balance') || msg.includes('too low') || msg.includes('billing')) {
            console.log(chalk.red('\n  Dobbi\'s AI provider is out of credits.'));
            console.log(chalk.dim('  Top up at: https://console.anthropic.com/settings/billing\n'));
        } else {
            console.log(chalk.yellow(`\n  Hmm, Dobbi tried to think about that but got confused: ${msg}`));
            console.log(chalk.dim('  Try rephrasing, or use a specific command like "todo", "note", "today".\n'));
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Patterns that look like API keys / tokens — redact before sending to LLM
const SECRET_PATTERNS = [
    /sk-[a-zA-Z0-9_-]{20,}/g,          // OpenAI keys
    /sk-ant-[a-zA-Z0-9_-]{20,}/g,      // Anthropic keys
    /ghp_[a-zA-Z0-9]{36,}/g,           // GitHub PATs
    /ghu_[a-zA-Z0-9]{36,}/g,           // GitHub user tokens
    /xox[bsarp]-[a-zA-Z0-9\-]{10,}/g,  // Slack tokens
];

const SECRET_KEYS = new Set([
    'apiKey', 'api_key', 'apikey',
    'secret', 'token', 'password',
    'authorization', 'credential',
]);

/**
 * Deep-scrub secret-shaped values from an object before it's sent to an LLM.
 */
function scrubSecrets(obj: unknown): unknown {
    if (typeof obj === 'string') {
        let s = obj;
        for (const pat of SECRET_PATTERNS) {
            s = s.replace(pat, '[REDACTED]');
        }
        return s;
    }
    if (Array.isArray(obj)) {
        return obj.map(scrubSecrets);
    }
    if (obj && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            if (SECRET_KEYS.has(k.toLowerCase())) {
                out[k] = '[REDACTED]';
            } else {
                out[k] = scrubSecrets(v);
            }
        }
        return out;
    }
    return obj;
}

/**
 * Strip markdown fences, fix common LLM JSON mistakes, and trim whitespace.
 */
function cleanJson(raw: string): string {
    let s = raw.trim();
    // Remove ```json ... ``` or ``` ... ```
    s = s.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    // Fix trailing commas before } or ] (very common LLM error)
    s = s.replace(/,\s*([\}\]])/g, '$1');
    // Fix missing closing quotes: "key": "value\n  →  "key": "value"\n
    s = s.replace(/":\s*"([^"]*?)(\n)/g, '": "$1"$2');
    return s.trim();
}

/**
 * Try multiple strategies to extract a JSON object from an LLM response.
 * Returns parsed object or throws.
 */
function parseJsonResponse(raw: string): Record<string, unknown> {
    // Strategy 1: clean and parse directly
    const cleaned = cleanJson(raw);
    try {
        return JSON.parse(cleaned);
    } catch {
        // continue to fallback strategies
    }

    // Strategy 2: extract the outermost { ... } block (handles preamble/postamble text)
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace >= 0) {
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let i = firstBrace; i < cleaned.length; i++) {
            const ch = cleaned[i];
            if (escape) { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{') depth++;
            if (ch === '}') {
                depth--;
                if (depth === 0) {
                    try {
                        return JSON.parse(cleaned.slice(firstBrace, i + 1));
                    } catch {
                        break;
                    }
                }
            }
        }
    }

    // Strategy 3: try to fix truncated JSON by closing open braces/brackets
    try {
        let fixed = cleaned;
        // Count unclosed braces and brackets
        let braces = 0, brackets = 0;
        let inStr = false, esc = false;
        for (const ch of fixed) {
            if (esc) { esc = false; continue; }
            if (ch === '\\' && inStr) { esc = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === '{') braces++;
            if (ch === '}') braces--;
            if (ch === '[') brackets++;
            if (ch === ']') brackets--;
        }
        // Remove any trailing partial key/value (after last comma or opening brace)
        fixed = fixed.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
        fixed = fixed.replace(/,\s*$/, '');
        // Close open brackets and braces
        for (let i = 0; i < brackets; i++) fixed += ']';
        for (let i = 0; i < braces; i++) fixed += '}';
        return JSON.parse(fixed);
    } catch {
        // give up
    }

    throw new Error(`Invalid JSON: ${cleaned.slice(0, 200)}…`);
}

/**
 * Ask a follow-up question using inquirer.
 * Inquirer manages its own stdin/stdout lifecycle, avoiding conflicts
 * with the shell's paused readline interface.
 */
async function askFollowUp(question: string): Promise<string> {
    const { answer } = await inquirer.prompt([{
        type: 'input',
        name: 'answer',
        message: question,
    }]);
    return answer as string;
}
