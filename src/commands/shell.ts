import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { spawn } from 'child_process';
import { listServiceTools } from '../tools/index.js';
import { getResponse } from '../responses.js';
import { StatusBar } from '../shell/tui.js';
import { StatusPoller } from '../shell/status-poller.js';
import { breadcrumbPrompt } from '../ui/breadcrumb.js';

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND TREE (for tab-completion)
// ─────────────────────────────────────────────────────────────────────────────

const COMMAND_TREE: Record<string, string[]> = {
    init: [],
    today: [],
    remember: ['-g'],
    project: ['list', 'switch', 'new'],
    config: ['add-provider', 'set-capability', 'list-capabilities', 'list-providers', 'set-name'],
    sync: [],
    note: [],
    todo: [],
    event: [],
    inbox: ['add'],
    service: ['start', 'stop', 'status'],
    queue: ['size', 'status', 'clear', 'pause', 'resume'],
    tools: [],
    tool: [],    // dynamically completed with tool names
    shell: [],
    help: [],
    clear: [],
    exit: [],
};

const TOP_LEVEL_COMMANDS = Object.keys(COMMAND_TREE);

/**
 * Build a completer function for readline.
 */
function buildCompleter(): (line: string) => [string[], string] {
    return (line: string): [string[], string] => {
        const trimmed = line.trimStart();
        const parts = trimmed.split(/\s+/);

        if (parts.length <= 1) {
            const partial = parts[0] || '';
            const hits = TOP_LEVEL_COMMANDS.filter(c => c.startsWith(partial));
            return [hits.map(h => h + ' '), partial];
        }

        const command = parts[0];
        const partial = parts[parts.length - 1] || '';

        if (command === 'tool') {
            if (parts.length === 2) {
                const toolNames = listServiceTools().map(t => t.name);
                const hits = toolNames.filter(t => t.startsWith(partial));
                return [hits.map(h => h + ' '), partial];
            }
            return [[], partial];
        }

        const subcommands = COMMAND_TREE[command];
        if (subcommands && subcommands.length > 0 && parts.length === 2) {
            const hits = subcommands.filter(s => s.startsWith(partial));
            return [hits.map(h => h + ' '), partial];
        }

        return [[], partial];
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND DISPATCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run a dobbie command in a subprocess.
 *
 * This completely isolates Commander from readline — the child process has its
 * own stdin/stdout and can never interfere with the shell's character echo.
 */
function runCommand(args: string[]): Promise<'continue' | 'quit'> {
    return new Promise((resolve) => {
        const child = spawn(process.argv[0], [process.argv[1], ...args], {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: process.env,
        });

        child.on('close', (code) => resolve(code === 42 ? 'quit' : 'continue'));
        child.on('error', (err) => {
            console.log(chalk.red(`Failed to run command: ${err.message}`));
            resolve('continue');
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHELL COMMAND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: print status bar then show prompt.
 */
function showPrompt(rl: readline.Interface, bar: StatusBar): void {
    bar.print();
    rl.prompt();
}

export function createShellCommand(_program: Command): Command {
    return new Command('shell')
        .alias('sh')
        .description('Start interactive shell mode with tab-completion')
        .action(async () => {
            const bar = new StatusBar();
            const poller = new StatusPoller(bar);

            // Start background polling (updates bar data silently)
            poller.start();

            await bar.printWelcome();

            const prompt = breadcrumbPrompt();

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                completer: buildCompleter(),
                prompt,
                terminal: true,
            });

            // Show initial status + prompt
            showPrompt(rl, bar);

            rl.on('line', (line: string) => {
                const handleLine = async () => {
                    const input = line.trim();

                    if (!input) {
                        showPrompt(rl, bar);
                        return;
                    }

                    // Built-in shell commands
                    if (input === 'exit' || input === 'quit') {
                        poller.stop();
                        console.log(chalk.cyan(`\n${getResponse('farewell')}\n`));
                        process.exit(0);
                    }

                    if (input === 'clear') {
                        console.clear();
                        showPrompt(rl, bar);
                        return;
                    }

                    if (input === 'help') {
                        printShellHelp();
                        showPrompt(rl, bar);
                        return;
                    }

                    // Dispatch via subprocess — keeps readline completely isolated
                    const args = input.split(/\s+/);
                    rl.pause();
                    const result = await runCommand(args);
                    rl.resume();

                    if (result === 'quit') {
                        poller.stop();
                        rl.close();
                        return;
                    }

                    console.log('');
                    showPrompt(rl, bar);
                };

                handleLine().catch((err) => {
                    console.log(chalk.red(`Unexpected error: ${err instanceof Error ? err.message : err}`));
                    showPrompt(rl, bar);
                });
            });

            rl.on('close', () => {
                poller.stop();
                console.log(chalk.cyan(`\n${getResponse('farewell')}\n`));
                process.exit(0);
            });

            // Handle Ctrl+C — don't exit, just clear the line
            rl.on('SIGINT', () => {
                process.stdout.write('\n');
                showPrompt(rl, bar);
            });

            // Keep the process alive
            await new Promise<void>(() => { });
        });
}

function printShellHelp(): void {
    console.log(chalk.cyan(`
${chalk.bold('Available Commands:')}

  ${chalk.bold('Vault:')}      init, sync, today
  ${chalk.bold('Projects:')}   project [list|switch|new]
  ${chalk.bold('Memory:')}     note, todo, event, inbox [add], remember
  ${chalk.bold('Config:')}     config [add-provider|set-capability|list-capabilities|list-providers|set-name]
  ${chalk.bold('Service:')}    service [start|stop|status]
  ${chalk.bold('Queue:')}      queue [size|status|clear|pause|resume]
  ${chalk.bold('Tools:')}      tools, tool <name>
  ${chalk.bold('Shell:')}      help, clear, exit
`));
}
