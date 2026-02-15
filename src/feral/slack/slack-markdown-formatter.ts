// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Markdown Formatter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Escapes and formats text for Slack's mrkdwn syntax.
 */
export class SlackMarkdownFormatter {
    /**
     * Escape special characters for Slack mrkdwn.
     */
    static format(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Wrap text in bold (*...*) with escaping.
     */
    static bold(text: string): string {
        return `*${SlackMarkdownFormatter.format(text)}*`;
    }

    /**
     * Wrap text in underline (_..._) with escaping.
     */
    static underline(text: string): string {
        return `_${SlackMarkdownFormatter.format(text)}_`;
    }

    /**
     * Wrap text in strikethrough (~...~) with escaping.
     */
    static strike(text: string): string {
        return `~${SlackMarkdownFormatter.format(text)}~`;
    }
}
