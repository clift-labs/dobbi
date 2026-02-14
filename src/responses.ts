/**
 * Dobbie's personality response catalog.
 * Each key maps to an array of possible responses.
 * Use getResponse(key) to get a random response.
 */

export type ResponseKey =
    | 'greeting'
    | 'farewell'
    | 'task_complete'
    | 'task_saved'
    | 'task_discarded'
    | 'thinking'
    | 'processing'
    | 'error'
    | 'no_vault'
    | 'need_project'
    | 'project_created'
    | 'project_switched'
    | 'sync_start'
    | 'sync_complete'
    | 'sync_error'
    | 'note_reviewing'
    | 'note_improved'
    | 'note_questions'
    | 'note_modified'
    | 'note_formatted'
    | 'todo_breakdown'
    | 'todo_clarified'
    | 'todo_estimated'
    | 'todo_modified'
    | 'event_clarified'
    | 'event_time_suggest'
    | 'event_modified'
    | 'inbox_empty'
    | 'inbox_processing'
    | 'inbox_complete'
    | 'remember_saved'
    | 'today_summary'
    | 'config_show'
    | 'provider_added'
    | 'capability_set'
    | 'diagram_generating'
    | 'help_offer'
    | 'startup_greeting';

const responses: Record<ResponseKey, string[]> = {
    greeting: [
        '🧝 Dobbie is at your service, {name}!',
        '🧝 Dobbie awaits your command, sir!',
        '🧝 How may Dobbie assist you today, {name}?',
        '🧝 Dobbie is ready and eager to help, sir!',
        '🧝 Dobbie is here! What does {name} require?',
        '🧝 Dobbie has been waiting, sir! How can Dobbie help?',
        '🧝 Good to see you, {name}! Dobbie is at the ready!',
    ],
    farewell: [
        'Dobbie is always here if you need anything else, {name}!',
        'Dobbie hopes this was helpful, sir!',
        'Dobbie will be waiting right here, {name}!',
        'Until next time, sir! Dobbie is honored to serve.',
        'Dobbie bids you farewell, {name}!',
        'Call on Dobbie anytime, sir!',
        'Dobbie is grateful to have helped, sir!',
    ],
    task_complete: [
        'Dobbie has completed the task, {name}!',
        'Done, sir! Dobbie hopes this pleases you.',
        'Dobbie has finished, {name}!',
        'All done, sir! Dobbie worked very hard on this.',
        'Task complete, sir! Dobbie is proud.',
        'Finished, {name}! Dobbie did it!',
        'Dobbie has accomplished the task, sir!',
    ],
    task_saved: [
        'Dobbie has saved everything, {name}!',
        'Saved successfully, sir!',
        'Dobbie has stored this safely, {name}!',
        'It is saved, sir! Dobbie made sure of it.',
        'Safely stored, sir!',
        'Dobbie has preserved it, sir!',
        'Everything is saved, {name}! Dobbie double-checked.',
    ],
    task_discarded: [
        'Dobbie has discarded it, sir.',
        'Discarded as requested, sir.',
        'Dobbie has thrown it away, sir.',
        'Gone, sir. Dobbie has removed it.',
        'Dobbie has deleted it, sir.',
        'It is no more, sir.',
        'Dobbie has disposed of it, sir.',
    ],
    thinking: [
        'Dobbie is thinking, sir...',
        'One moment, sir... Dobbie is pondering...',
        'Dobbie is considering this carefully, sir...',
        'Let Dobbie think about this, sir...',
        'Dobbie is contemplating, sir...',
        'Hmm, Dobbie is working this out, sir...',
        'Dobbie needs a moment to think, sir...',
    ],
    processing: [
        'Dobbie is working on it, sir...',
        'Dobbie is processing, sir...',
        'One moment, sir...',
        'Dobbie is on it, sir...',
        'Working, sir...',
        'Dobbie is handling this, sir...',
        'Please wait, sir... Dobbie is busy...',
    ],
    error: [
        'Dobbie encountered a problem, sir.',
        'Oh no, sir! Dobbie ran into an error.',
        'Dobbie is sorry, sir. Something went wrong.',
        'Dobbie must report an error, sir.',
        'Dobbie has bad news, sir. There was an error.',
        'Something failed, sir. Dobbie apologizes.',
        'Dobbie tried, sir, but there was a problem.',
    ],
    no_vault: [
        'Dobbie cannot find a vault here, sir.',
        'This directory has no vault, sir. Dobbie cannot proceed.',
        'Sir, Dobbie needs a vault to work. Please run dobbie init.',
        'No vault found, sir. Dobbie is lost without one.',
        'Dobbie requires a vault, sir. This directory has none.',
        'Sir, please create a vault first with dobbie init.',
        'Dobbie looked everywhere, sir, but found no vault.',
    ],
    need_project: [
        'Dobbie needs to know which project, sir.',
        'Which project shall Dobbie work on, sir?',
        'Please tell Dobbie which project, sir.',
        'Dobbie requires a project to be selected, sir.',
        'Sir, Dobbie needs a project to proceed.',
        'Which project, sir? Dobbie awaits your choice.',
        'Dobbie cannot continue without knowing the project, sir.',
    ],
    project_created: [
        'Dobbie has created the project, sir!',
        'Project created successfully, sir!',
        'Your new project is ready, sir!',
        'Dobbie set up the project for you, sir!',
        'The project is now ready, sir!',
        'Dobbie has prepared everything, sir!',
        'Project initialized, sir! Ready to go!',
    ],
    project_switched: [
        'Dobbie has switched to the project, sir!',
        'Now working on the project, sir!',
        'Dobbie is ready to work on this project, sir!',
        'Switched successfully, sir!',
        'Dobbie is now focused on this project, sir!',
        'Project changed, sir! Dobbie is ready.',
        'Dobbie has moved to the new project, sir!',
    ],
    sync_start: [
        'Dobbie is syncing with GitHub, sir...',
        'Syncing everything now, sir...',
        'Dobbie is pushing to GitHub, sir...',
        'Starting sync, sir...',
        'Dobbie is connecting to GitHub, sir...',
        'Uploading changes, sir...',
        'Dobbie is synchronizing, sir...',
    ],
    sync_complete: [
        'Dobbie has synced everything, {name}!',
        'All synced up, sir!',
        'GitHub sync complete, {name}!',
        'Everything is safely synced, sir!',
        'Sync successful, sir!',
        'Dobbie has pushed all changes, {name}!',
        'Your work is backed up, sir!',
    ],
    sync_error: [
        'Dobbie had trouble syncing, sir.',
        'The sync failed, sir. Dobbie is sorry.',
        'Dobbie could not complete the sync, sir.',
        'Sync encountered an error, sir.',
        'GitHub rejected Dobbie, sir. Something went wrong.',
        'Dobbie failed to push, sir.',
        'There was a problem with the sync, sir.',
    ],
    note_reviewing: [
        'Dobbie is reviewing your note, sir...',
        'Let Dobbie take a look at this, sir...',
        'Dobbie is carefully reading this, sir...',
        'Reviewing now, sir...',
        'Dobbie is examining your note, sir...',
        'Dobbie is studying this carefully, sir...',
        'Reading through it now, sir...',
    ],
    note_improved: [
        'Dobbie has improved the note, sir!',
        'The note is better now, sir!',
        'Dobbie has polished it up, sir!',
        'Note enhanced, sir!',
        'Dobbie made it shine, sir!',
        'Improvements applied, sir!',
        'Dobbie has refined the note, sir!',
    ],
    note_questions: [
        'Dobbie has some questions about this, sir:',
        'Here are some things to consider, sir:',
        'Dobbie wonders about these points, sir:',
        'Some questions for you, sir:',
        'Dobbie is curious about these things, sir:',
        'These points need clarification, sir:',
        'Dobbie would like to ask, sir:',
    ],
    note_modified: [
        'Dobbie has modified the note, sir!',
        'Changes applied, sir!',
        'The note has been updated, sir!',
        'Note modified successfully, sir!',
        'Dobbie has made the changes, sir!',
        'Updates complete, sir!',
        'Dobbie altered the note as requested, sir!',
    ],
    note_formatted: [
        'Dobbie is formatting your note as markdown, sir...',
        'Making it look nice, sir...',
        'Dobbie is tidying up the formatting, sir...',
        'Formatting now, sir...',
        'Dobbie is making it pretty, sir...',
        'Applying markdown formatting, sir...',
        'Dobbie is beautifying your note, sir...',
    ],
    todo_breakdown: [
        'Dobbie is breaking down the task, sir...',
        'Let Dobbie split this into smaller pieces, sir...',
        'Dobbie is creating subtasks, sir...',
        'Breaking it down now, sir...',
        'Dobbie is dividing the work, sir...',
        'Splitting into manageable parts, sir...',
        'Dobbie is decomposing the task, sir...',
    ],
    todo_clarified: [
        'Dobbie has clarified the task, sir!',
        'The todo is clearer now, sir!',
        'Dobbie has made it more specific, sir!',
        'Task clarified, sir!',
        'Dobbie improved the description, sir!',
        'Much clearer now, sir!',
        'Dobbie has sharpened the details, sir!',
    ],
    todo_estimated: [
        'Dobbie has analyzed the effort, sir.',
        'Here is Dobbie\'s estimate, sir.',
        'Dobbie has assessed this task, sir.',
        'Estimation complete, sir.',
        'Dobbie calculated the effort, sir.',
        'Here\'s what Dobbie thinks it will take, sir.',
        'Dobbie has evaluated the complexity, sir.',
    ],
    todo_modified: [
        'Dobbie has modified the todo, sir!',
        'Todo updated, sir!',
        'Changes applied to the todo, sir!',
        'Todo modified successfully, sir!',
        'Dobbie has updated the task, sir!',
        'The todo has been changed, sir!',
        'Dobbie made the adjustments, sir!',
    ],
    event_clarified: [
        'Dobbie has clarified the event, sir!',
        'The event details are clearer now, sir!',
        'Dobbie has improved the description, sir!',
        'Event clarified, sir!',
        'Dobbie enhanced the event details, sir!',
        'Much clearer now, sir!',
        'Dobbie has sharpened the event info, sir!',
    ],
    event_time_suggest: [
        'Dobbie has some timing suggestions, sir.',
        'Here are Dobbie\'s thoughts on scheduling, sir.',
        'Dobbie analyzed the timing, sir.',
        'Some scheduling ideas, sir.',
        'Dobbie has timing recommendations, sir.',
        'Here\'s what Dobbie suggests for timing, sir.',
        'Dobbie considered the schedule, sir.',
    ],
    event_modified: [
        'Dobbie has modified the event, sir!',
        'Event updated, sir!',
        'Changes applied to the event, sir!',
        'Event modified successfully, sir!',
        'Dobbie has updated the event, sir!',
        'The event has been changed, sir!',
        'Dobbie made the adjustments, sir!',
    ],
    inbox_empty: [
        'Inbox is empty, sir. Nothing to process.',
        'No items in the inbox, sir!',
        'The inbox is clear, sir!',
        'Nothing to process, sir. Inbox is empty.',
        'Dobbie found nothing in the inbox, sir.',
        'All clear, sir! No inbox items.',
        'The inbox has no items, sir.',
    ],
    inbox_processing: [
        'Dobbie is processing the inbox, sir...',
        'Let Dobbie sort through these, sir...',
        'Dobbie is organizing the inbox, sir...',
        'Processing inbox items, sir...',
        'Dobbie is categorizing everything, sir...',
        'Sorting through the inbox, sir...',
        'Dobbie is handling each item, sir...',
    ],
    inbox_complete: [
        'Dobbie has processed all inbox items, sir!',
        'Inbox cleared, sir!',
        'All items sorted, sir!',
        'Inbox processing complete, sir!',
        'Dobbie has organized everything, sir!',
        'All items categorized, sir!',
        'Inbox is now empty, sir!',
    ],
    remember_saved: [
        'Dobbie will remember that, {name}!',
        'Stored in memory, sir!',
        'Dobbie has noted it down, {name}!',
        'Dobbie won\'t forget, sir!',
        'Committed to memory, sir!',
        'Dobbie has saved it, {name}!',
        'Remembered, sir!',
    ],
    today_summary: [
        'Here\'s what Dobbie found for today, {name}.',
        'Your daily summary, sir.',
        'Dobbie has gathered everything for today, {name}.',
        'Today\'s overview, sir.',
        'Here is your day, {name}.',
        'Dobbie prepared today\'s summary, sir.',
        'What\'s ahead today, sir:',
    ],
    config_show: [
        'Here is your configuration, sir.',
        'Dobbie\'s settings, sir:',
        'Current configuration, sir:',
        'Your settings, sir.',
        'Here are the configurations, sir.',
        'Dobbie\'s current setup, sir:',
        'Configuration details, sir:',
    ],
    provider_added: [
        'Dobbie has added the provider, sir!',
        'Provider configured successfully, sir!',
        'The API key is saved, sir!',
        'Provider added, sir!',
        'Dobbie has set up the provider, sir!',
        'Connection configured, sir!',
        'Provider is ready to use, sir!',
    ],
    capability_set: [
        'Dobbie has set the capability, sir!',
        'Capability configured, sir!',
        'The model is now assigned, sir!',
        'Capability updated, sir!',
        'Dobbie has configured it, sir!',
        'Model assigned successfully, sir!',
        'Capability is now active, sir!',
    ],
    diagram_generating: [
        'Dobbie is generating a diagram, sir...',
        'Creating the diagram now, sir...',
        'Dobbie is drawing this out, sir...',
        'Generating visualization, sir...',
        'Dobbie is sketching the diagram, sir...',
        'Building the diagram, sir...',
        'Dobbie is crafting a visual, sir...',
    ],
    help_offer: [
        'Is there anything else Dobbie can help with, {name}?',
        'Dobbie hopes this was helpful, {name}!',
        'Let Dobbie know if you need anything else, sir!',
        'Dobbie is always happy to help, sir!',
        'What else can Dobbie do for you, {name}?',
        'Dobbie remains at your service, sir!',
        'Dobbie is here if you need more help, {name}!',
    ],
    startup_greeting: [
        '🧝 *yawns* Dobbie is awake and ready to serve, {name}!',
        '🧝 Dobbie has polished his socks and is reporting for duty, {name}!',
        '🧝 Systems online, sir! Dobbie ran all the diagnostics twice... just to be safe.',
        '🧝 Dobbie is here, {name}! The socks are sorted and the quills are sharp!',
        '🧝 *cracks knuckles* Dobbie is warmed up and eager, sir!',
        '🧝 Good day, {name}! Dobbie has been counting the seconds until your return.',
        '🧝 Dobbie\'s ears perked up the moment you arrived, {name}!',
        '🧝 All candles lit, all scrolls ready — Dobbie awaits your command, sir!',
        '🧝 Dobbie checked the vault, polished the projects, and is standing by, {name}!',
        '🧝 *bounces excitedly* Dobbie is fully operational and at your service, sir!',
    ],
};

import { getUserName } from './state/manager.js';

/**
 * Get a random response for the given key (sync version, no name substitution).
 */
export function getResponse(key: ResponseKey): string {
    const options = responses[key];
    if (!options || options.length === 0) {
        return '';
    }
    const index = Math.floor(Math.random() * options.length);
    return options[index];
}

/**
 * Get a random response with the user's name automatically substituted.
 * Use this for user-facing messages.
 */
export async function getPersonalizedResponse(key: ResponseKey): Promise<string> {
    let response = getResponse(key);
    if (response.includes('{name}')) {
        const name = await getUserName();
        response = response.replace(/{name}/g, name);
    }
    return response;
}

/**
 * Get a random response with custom placeholders replaced.
 * @param key Response key
 * @param replacements Object mapping placeholder names to values
 */
export function getResponseWith(key: ResponseKey, replacements: Record<string, string>): string {
    let response = getResponse(key);
    for (const [placeholder, value] of Object.entries(replacements)) {
        response = response.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), value);
    }
    return response;
}

export default responses;

