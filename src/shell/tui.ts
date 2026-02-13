/**
 * TUI status bar for the Dobbie interactive shell.
 *
 * Simple inline approach: prints a status divider line before each prompt.
 * No alternate screen, no cursor tricks — just works with readline.
 */

import chalk from 'chalk';

// ─────────────────────────────────────────────────────────────────────────────
// Status data
// ─────────────────────────────────────────────────────────────────────────────

export interface ShellStatus {
    serviceRunning: boolean;
    queueSize: number;
    queueMax: number;
    project: string | null;
}

const DEFAULT_STATUS: ShellStatus = {
    serviceRunning: false,
    queueSize: 0,
    queueMax: 10,
    project: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// StatusBar class
// ─────────────────────────────────────────────────────────────────────────────

export class StatusBar {
    private status: ShellStatus = { ...DEFAULT_STATUS };

    /**
     * Update status data (does NOT print — call print() separately).
     */
    update(status: Partial<ShellStatus>): void {
        Object.assign(this.status, status);
    }

    /**
     * Print the status divider line.
     * Call this right before each prompt.
     */
    print(): void {
        const cols = process.stdout.columns || 80;

        // Build segments
        const service = this.status.serviceRunning
            ? chalk.green('●') + chalk.white(' Running')
            : chalk.red('○') + chalk.white(' Stopped');

        const queue = this.status.queueSize > 0
            ? chalk.yellow('⬡') + chalk.white(` ${this.status.queueSize}/${this.status.queueMax}`)
            : chalk.gray('⬡') + chalk.gray(` ${this.status.queueSize}/${this.status.queueMax}`);

        const project = this.status.project
            ? chalk.white(`📁 ${this.status.project}`)
            : chalk.gray('📁 none');

        const content = ` ${service} │ ${queue} │ ${project} `;

        // Fill remaining width with ─
        // Visible character count (approximate — emojis and ANSI make exact count hard)
        const visibleLen = this.stripAnsi(content).length;
        const padding = Math.max(0, cols - visibleLen - 2);
        const leftDash = '─';
        const rightDashes = '─'.repeat(padding);

        console.log(chalk.gray(`${leftDash}${content}${rightDashes}`));
    }

    /**
     * Print the initial welcome header.
     */
    printWelcome(): void {
        console.log(chalk.cyan('\n🧝 Dobbie interactive shell, sir!'));
        console.log(chalk.gray('   Tab-complete commands • Up/Down for history • Type "exit" or Ctrl+D to leave\n'));
    }

    private stripAnsi(str: string): string {
        return str.replace(/\x1b\[[0-9;]*m/g, '');
    }
}
