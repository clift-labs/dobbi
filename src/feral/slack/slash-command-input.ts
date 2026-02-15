// ─────────────────────────────────────────────────────────────────────────────
// Feral Slack — Slash Command Input DTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strongly-typed DTO wrapping parsed Slack slash command POST data.
 */
export class SlashCommandInput {
    readonly token: string;
    readonly command: string;
    readonly text: string;
    readonly responseUrl: string;
    readonly triggerId: string;
    readonly userId: string;
    readonly userName: string;
    readonly teamId: string;
    readonly enterpriseId: string;
    readonly channelId: string;
    readonly apiAppId: string;

    constructor(data: Record<string, string>) {
        this.token = data.token ?? '';
        this.command = data.command ?? '';
        this.text = data.text ?? '';
        this.responseUrl = data.response_url ?? '';
        this.triggerId = data.trigger_id ?? '';
        this.userId = data.user_id ?? '';
        this.userName = data.user_name ?? '';
        this.teamId = data.team_id ?? '';
        this.enterpriseId = data.enterprise_id ?? '';
        this.channelId = data.channel_id ?? '';
        this.apiAppId = data.api_app_id ?? '';
    }
}

/**
 * Parse a URL-encoded POST body into key-value pairs.
 * Equivalent to PHP's parse_str().
 */
export function parseUrlEncodedBody(body: string): Record<string, string> {
    const params = new URLSearchParams(body);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
        result[key] = value;
    }
    return result;
}
