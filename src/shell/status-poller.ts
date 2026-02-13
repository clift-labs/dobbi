/**
 * Background status poller for the Dobbie shell.
 *
 * Polls service status, queue size, and active project on a timer
 * and updates the StatusBar data.
 */

import { getDaemonStatus } from '../service/daemon.js';
import { getServiceClient } from '../client/index.js';
import { findVaultRoot } from '../state/manager.js';
import { getActiveProject } from '../state/manager.js';
import type { StatusBar, ShellStatus } from './tui.js';

const POLL_INTERVAL_MS = 5000;

export class StatusPoller {
    private timer: NodeJS.Timeout | null = null;
    private bar: StatusBar;

    constructor(bar: StatusBar) {
        this.bar = bar;
    }

    /**
     * Start polling. Runs an initial poll immediately.
     */
    start(): void {
        this.poll();
        this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    }

    /**
     * Stop polling.
     */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    /**
     * Run a single poll cycle.
     */
    private async poll(): Promise<void> {
        const status: Partial<ShellStatus> = {};

        // Service status
        try {
            const daemon = await getDaemonStatus();
            status.serviceRunning = daemon.running;
        } catch {
            status.serviceRunning = false;
        }

        // Queue size (only if service is running)
        if (status.serviceRunning) {
            try {
                const client = getServiceClient();
                await client.connect();
                const queueStatus = await client.getQueueStatus();
                const result = queueStatus.result as { size: number; maxSize: number };
                status.queueSize = result.size;
                status.queueMax = result.maxSize;
                client.disconnect();
            } catch {
                status.queueSize = 0;
            }
        } else {
            status.queueSize = 0;
        }

        // Active project
        try {
            const vault = await findVaultRoot();
            if (vault) {
                status.project = await getActiveProject();
            } else {
                status.project = null;
            }
        } catch {
            status.project = null;
        }

        // Update the status bar data (doesn't print — that happens before each prompt)
        this.bar.update(status);
    }
}
