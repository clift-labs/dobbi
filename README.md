# Dobbi

An AI-powered personal assistant that lives in your terminal. Dobbi manages your todos, events, notes, goals, people, and more — all stored as plain Markdown files in a local "vault" folder.

Think of it as a loyal house-elf for your digital life: polite, eager, and surprisingly capable.

> **Requires an API key from [OpenAI](https://platform.openai.com) and/or [Anthropic](https://console.anthropic.com).**

```
                               .......
                            .:------::::...
                          .-==------::::::..
                       ..:==---------::::--:...
               ....::::-=+++====-----====-------:.....
              .-=+***++=++++***++=:=+***=+====****+=-..
            .:=+===++***++++*#*++-::-+*+-===+##*+==++=:.
           .:==++++++****+++++==+=::::----===*#*+*+++++:.
          ..--===++++++*+++===++++==-==--===+**++++-::=-.
                .:==++++++===++++++++========--=-:........
                   ..::..:==+++++==+--=+==:......
                      .. ..-=+++*****+++=:.
                           ..-=========-....
                            ..+*++++++==:.....
                               D O B B I
```

## Quick Start

```bash
# Install globally
npm install -g dobbi

# Initialize your vault
dobbi init

# Add an API key (OpenAI or Anthropic)
dobbi config add-provider openai

# Launch the interactive shell
dobbi
```

That's it. Dobbi is ready to serve.

## Requirements

- **Node.js 18** or later
- An API key from **OpenAI** and/or **Anthropic**

## Install from Source

If you prefer to build from source:

```bash
git clone https://github.com/clift-labs/dobbi.git
cd dobbi
npm install
npm run build
npm link
```

## What Dobbi Does

All of your information stays **local** — stored as plain Markdown files with YAML frontmatter, organized into structured content types within your vault (`~/.dobbi/` by default). Dobbi comes with built-in content types for common needs, and can create new ones on the fly when he needs a new way to store information for his human.

### Content Types

| Type | Description |
|------|-------------|
| **todo** | Tasks with priority, status, and due dates |
| **event** | Calendar events with start/end times and locations |
| **note** | Freeform notes |
| **goal** | Long-term objectives |
| **person** | Contact details and relationship notes |
| **recurrence** | Recurring task templates |
| **todont** | Things you're deliberately *not* doing |
| **research** | Research topics and findings |

You can also define your own custom entity types.

### Natural Language Chat

Just type naturally and Dobbi figures out what to do:

```
> remind me to call the dentist tomorrow
> what's on my plate today?
> create a goal to run a half marathon by June
> add a note about the meeting with Sarah
```

### Dynamic Process Generation

What sets Dobbi apart from other personal agents is that it **writes a unique software process for every request**. Instead of following rigid, pre-built workflows, Dobbi dynamically assembles a process graph tailored to exactly what you asked for.

This is powered by the **FeralCCF** (Feral Catalog-Code Framework) library, which has three layers:

- **NodeCode** — reusable logic templates (e.g., "query todos", "format as markdown", "call LLM")
- **CatalogNodes** — configured instances of NodeCode with default settings
- **ProcessNodes** — the actual nodes wired together into a directed graph for a specific request

When you say "show me my high-priority tasks due this week", Dobbi doesn't run a canned query — it builds a process that selects the right nodes, connects them, and executes the graph. The **Web UI** visualizes the process that was created for each action, so you can see exactly what Dobbi did and how.

## Commands

Run `dobbi` with no arguments to enter the interactive shell, or use commands directly:

| Command | Description |
|---------|-------------|
| `dobbi` | Launch interactive shell |
| `dobbi init` | Initialize a new vault |
| `dobbi setup` | Change your name/gender preferences |
| `dobbi today` | Show today's tasks and schedule |
| `dobbi todo [title]` | Create or list tasks |
| `dobbi todo done <title>` | Mark a task complete |
| `dobbi event [title]` | Create or list events |
| `dobbi note [title]` | Create or list notes |
| `dobbi goal [title]` | Create or list goals |
| `dobbi person [name]` | Create or list people |
| `dobbi todont [title]` | Create or list todonts |
| `dobbi remember <text>` | Quick-capture to inbox |
| `dobbi cal` | Calendar view |
| `dobbi project` | Manage projects |
| `dobbi config` | View/manage LLM configuration |
| `dobbi service start` | Start the background service + web UI |
| `dobbi shell` | Enter interactive mode (same as no args) |

## BYOK (Bring Your Own Key)

Dobbi doesn't come with an API key — you bring your own from [OpenAI](https://platform.openai.com) and/or [Anthropic](https://console.anthropic.com). Your keys are stored locally in `~/.dobbi/secrets.json` and never leave your machine.

```bash
# Add OpenAI
dobbi config add-provider openai

# Add Anthropic
dobbi config add-provider anthropic

# Or both — Dobbi will use each provider's strengths
```

When both providers are configured, Dobbi automatically picks the best model for each task based on six **capabilities**:

| Capability | What it does | OpenAI default | Anthropic default |
|------------|-------------|----------------|-------------------|
| reason | Complex thinking | gpt-4o | claude-opus-4-6 |
| chat | Conversation | gpt-4o | claude-sonnet-4-6 |
| summarize | Condensing info | gpt-4o-mini | claude-haiku-4-5 |
| categorize | Classification | gpt-4o-mini | claude-haiku-4-5 |
| format | Text formatting | gpt-4o-mini | claude-haiku-4-5 |
| embed | Vector embeddings | text-embedding-3-small | *(not supported)* |

You can override any mapping:

```bash
dobbi config set-capability reason anthropic claude-sonnet-4-6
dobbi config reset-capability reason   # restore auto-selection
dobbi config                           # view current configuration
```

### Where Things Live

```
~/.dobbi/
  .state.json         # User profile (name, gender, active project)
  secrets.json         # API keys (never committed)
  config.json          # LLM capability overrides
  entity-types.json    # Custom entity type definitions
  projects/
    my-project/
      todos/           # Markdown files with YAML frontmatter
      events/
      notes/
      goals/
      people/
      recurrences/
      todonts/
      research/
      inbox/
      .socks.md        # Project context (read by the LLM)
  .trash/              # Soft-deleted entities
```

Every entity is a plain `.md` file. You can edit them with any text editor, sync them with Git, or back them up however you like.

## Web UI

Dobbi includes a browser-based dashboard:

```bash
dobbi service start
```

This starts a background daemon with a web UI (default: `http://localhost:3001`) that shows:

- Today's tasks with priority badges
- 3-day calendar view
- Chat interface with the same natural language capabilities as the CLI
- Interactive Q&A when Dobbi needs clarification during a process

## The Interactive Shell

When you run `dobbi` with no arguments, you get a full interactive shell with:

- **Tab completion** for commands
- **Up/Down arrow** history
- **Natural language fallback** — anything that isn't a command gets routed to the AI chat
- **Project context** — the LLM reads `.socks.md` files for project-specific context

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm test             # Run unit tests
npm run test:all     # Run all tests including integration
npm run build        # Compile TypeScript to dist/
```

## License

MIT
