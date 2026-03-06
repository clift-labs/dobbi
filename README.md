# Dobbie

An AI-powered personal assistant that lives in your terminal. Dobbie manages your todos, events, notes, goals, people, and more — all stored as plain Markdown files in a local "vault" folder.

Think of it as a loyal house-elf for your digital life: polite, eager, and surprisingly capable.

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
                               D O B B I E
```

## Quick Start

```bash
# Install globally (one command, just like Claude Code)
npm install -g dobbie

# Initialize your vault
dobbie init

# Add an API key (OpenAI or Anthropic)
dobbie config add-provider openai

# Launch the interactive shell
dobbie
```

That's it. Dobbie is ready to serve.

## Requirements

- **Node.js 18** or later
- An API key from **OpenAI** and/or **Anthropic**

## Install from Source

If you prefer to build from source:

```bash
git clone https://github.com/clift-labs/dobbie.git
cd dobbie
npm install
npm run build
npm link
```

## What Dobbie Does

Dobbie manages **entities** — structured Markdown files with YAML frontmatter — organized into projects inside your vault (`~/.dobbie/` by default).

### Entity Types

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

Just type naturally and Dobbie figures out what to do:

```
> remind me to call the dentist tomorrow
> what's on my plate today?
> create a goal to run a half marathon by June
> add a note about the meeting with Sarah
```

Under the hood, Dobbie uses a **Flow-Based Programming engine** (Feral) that dynamically builds and executes process graphs to fulfill your requests — selecting capabilities, chaining nodes, and synthesizing a response.

## Commands

Run `dobbie` with no arguments to enter the interactive shell, or use commands directly:

| Command | Description |
|---------|-------------|
| `dobbie` | Launch interactive shell |
| `dobbie init` | Initialize a new vault |
| `dobbie setup` | Change your name/gender preferences |
| `dobbie today` | Show today's tasks and schedule |
| `dobbie todo [title]` | Create or list tasks |
| `dobbie todo done <title>` | Mark a task complete |
| `dobbie event [title]` | Create or list events |
| `dobbie note [title]` | Create or list notes |
| `dobbie goal [title]` | Create or list goals |
| `dobbie person [name]` | Create or list people |
| `dobbie todont [title]` | Create or list todonts |
| `dobbie remember <text>` | Quick-capture to inbox |
| `dobbie cal` | Calendar view |
| `dobbie project` | Manage projects |
| `dobbie config` | View/manage LLM configuration |
| `dobbie service start` | Start the background service + web UI |
| `dobbie shell` | Enter interactive mode (same as no args) |

## Configuration

### API Keys

Dobbie needs at least one LLM provider. Add your key and Dobbie auto-selects the best model for each task:

```bash
# Option A: OpenAI
dobbie config add-provider openai

# Option B: Anthropic
dobbie config add-provider anthropic

# Or both — Dobbie will use each provider's strengths
```

### How Model Selection Works

Dobbie maps six **capabilities** to the optimal model per provider:

| Capability | What it does | OpenAI default | Anthropic default |
|------------|-------------|----------------|-------------------|
| reason | Complex thinking | gpt-4o | claude-opus-4-6 |
| chat | Conversation | gpt-4o | claude-sonnet-4-6 |
| summarize | Condensing info | gpt-4o-mini | claude-haiku-4-5 |
| categorize | Classification | gpt-4o-mini | claude-haiku-4-5 |
| format | Text formatting | gpt-4o-mini | claude-haiku-4-5 |
| embed | Vector embeddings | text-embedding-3-small | *(not supported)* |

When both providers are configured, Dobbie picks the best provider per capability automatically. You can override any mapping:

```bash
dobbie config set-capability reason anthropic claude-sonnet-4-6
dobbie config reset-capability reason   # restore auto-selection
```

View your current configuration:

```bash
dobbie config
```

### Where Things Live

```
~/.dobbie/
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

Dobbie includes a browser-based dashboard:

```bash
dobbie service start
```

This starts a background daemon with a web UI (default: `http://localhost:3001`) that shows:

- Today's tasks with priority badges
- 3-day calendar view
- Chat interface with the same natural language capabilities as the CLI
- Interactive Q&A when Dobbie needs clarification during a process

## The Interactive Shell

When you run `dobbie` with no arguments, you get a full interactive shell with:

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
