import net from 'net';
import { loadSecrets } from '../config.js';
import { debug } from '../utils/debug.js';
import { randomUUID } from 'crypto';
import { getDaemonStatus, SOCKET_PATH } from '../service/daemon.js';
import type { ServiceRequest, ServiceResponse, Task } from '../service/protocol.js';
import { ServiceNotRunningError } from '../service/protocol.js';

/**
 * Client for communicating with the Dobbie service.
 */
export class ServiceClient {
    private socket: net.Socket | null = null;
    private responseBuffer = '';
    private responseHandlers: Map<string, { resolve: (response: ServiceResponse) => void; reject: (error: Error) => void }> = new Map();

    /**
     * Check if the service is running.
     */
    async isServiceRunning(): Promise<boolean> {
        const status = await getDaemonStatus();
        return status.running;
    }

    /**
     * Connect to the service.
     */
    async connect(): Promise<void> {
        if (this.socket && !this.socket.destroyed) {
            return;
        }

        const status = await getDaemonStatus();
        if (!status.running) {
            throw new ServiceNotRunningError();
        }

        return new Promise((resolve, reject) => {
            this.socket = net.createConnection(SOCKET_PATH, () => {
                resolve();
            });

            this.socket.on('data', (data) => {
                this.handleData(data);
            });

            this.socket.on('error', (error) => {
                reject(error);
            });

            this.socket.on('close', () => {
                this.socket = null;
            });
        });
    }

    /**
     * Disconnect from the service.
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
        }
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.socket !== null && !this.socket.destroyed;
    }

    /**
     * Submit a task to the service.
     */
    async submitTask(task: Task): Promise<ServiceResponse> {
        const request: ServiceRequest = {
            id: randomUUID(),
            type: 'task',
            sessionId: task.sessionId,
            payload: task,
        };
        return this.sendRequest(request);
    }

    /**
     * Get queue size.
     */
    async getQueueSize(): Promise<number> {
        const response = await this.query('queue.size');
        return (response.result as { size: number }).size;
    }

    /**
     * Get full queue status.
     */
    async getQueueStatus(): Promise<ServiceResponse> {
        return this.query('queue.status');
    }

    /**
     * Get task status by ID.
     */
    async getTaskStatus(taskId: string): Promise<ServiceResponse> {
        return this.query('task.status', { taskId });
    }

    /**
     * Clear the queue.
     */
    async clearQueue(): Promise<ServiceResponse> {
        return this.control('queue.clear', { confirm: true });
    }

    /**
     * Pause the queue processor.
     */
    async pauseQueue(): Promise<ServiceResponse> {
        return this.control('queue.pause');
    }

    /**
     * Resume the queue processor.
     */
    async resumeQueue(): Promise<ServiceResponse> {
        return this.control('queue.resume');
    }

    /**
     * Wait for a task to complete.
     */
    async waitForTask(taskId: string, pollIntervalMs = 500, timeoutMs = 30000): Promise<Task | null> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const response = await this.getTaskStatus(taskId);
            const task = response.result as Task | null;

            if (!task) {
                return null;
            }

            if (task.status === 'completed' || task.status === 'error') {
                return task;
            }

            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        return null;
    }

    /**
     * Send a query request.
     */
    private async query(query: string, params: Record<string, string> = {}): Promise<ServiceResponse> {
        const request: ServiceRequest = {
            id: randomUUID(),
            type: 'query',
            payload: { query, ...params } as unknown as import('../service/protocol.js').QueryPayload,
        };
        return this.sendRequest(request);
    }

    /**
     * Send a control request.
     */
    private async control(control: string, params: Record<string, unknown> = {}): Promise<ServiceResponse> {
        const request: ServiceRequest = {
            id: randomUUID(),
            type: 'control',
            payload: { control, ...params } as unknown as import('../service/protocol.js').ControlPayload,
        };
        return this.sendRequest(request);
    }

    /**
     * Send a request and wait for response.
     */
    private async sendRequest(request: ServiceRequest): Promise<ServiceResponse> {
        if (!this.socket || this.socket.destroyed) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.responseHandlers.delete(request.id);
                reject(new Error('Request timeout'));
            }, 30000);

            this.responseHandlers.set(request.id, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
            });

            this.socket!.write(JSON.stringify(request) + '\n');
        });
    }

    /**
     * Handle incoming data.
     */
    private handleData(data: Buffer): void {
        this.responseBuffer += data.toString();

        const lines = this.responseBuffer.split('\n');
        this.responseBuffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const response: ServiceResponse = JSON.parse(line);
                const handler = this.responseHandlers.get(response.requestId);
                if (handler) {
                    this.responseHandlers.delete(response.requestId);
                    handler.resolve(response);
                }
            } catch (err) {
                debug('client', err);
                // Ignore parse errors
            }
        }
    }
}

// Singleton instance
let client: ServiceClient | null = null;

export function getServiceClient(): ServiceClient {
    if (!client) {
        client = new ServiceClient();
    }
    return client;
}
