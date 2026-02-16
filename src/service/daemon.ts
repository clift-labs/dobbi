import { promises as fs } from 'fs';
import { getResponse } from '../responses.js';
import { debug } from '../utils/debug.js';
import path from 'path';
import os from 'os';
import { spawn, ChildProcess } from 'child_process';

const DOBBIE_DIR = path.join(os.homedir(), '.dobbie');
const PID_FILE = path.join(DOBBIE_DIR, 'dobbie.pid');
const SOCKET_PATH = path.join(DOBBIE_DIR, 'dobbie.sock');
const LOG_FILE = path.join(DOBBIE_DIR, 'dobbie.log');

export interface DaemonStatus {
    running: boolean;
    pid: number | null;
    socketPath: string;
}

/**
 * Ensures the .dobbie directory exists.
 */
async function ensureDobbieDir(): Promise<void> {
    await fs.mkdir(DOBBIE_DIR, { recursive: true });
}

/**
 * Read the PID from the pid file.
 */
export async function readPid(): Promise<number | null> {
    try {
        const content = await fs.readFile(PID_FILE, 'utf-8');
        const pid = parseInt(content.trim(), 10);
        return isNaN(pid) ? null : pid;
    } catch (err) {
        debug('daemon', err);
        return null;
    }
}

/**
 * Write the PID to the pid file.
 */
async function writePid(pid: number): Promise<void> {
    await ensureDobbieDir();
    await fs.writeFile(PID_FILE, pid.toString());
}

/**
 * Remove the PID file.
 */
async function removePid(): Promise<void> {
    try {
        await fs.unlink(PID_FILE);
    } catch (err) {
        debug('daemon', err);
        // Ignore errors
    }
}

/**
 * Check if a process is running by PID.
 */
function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        debug('daemon', err);
        return false;
    }
}

/**
 * Get the current daemon status.
 */
export async function getDaemonStatus(): Promise<DaemonStatus> {
    const pid = await readPid();
    const running = pid !== null && isProcessRunning(pid);

    // Clean up stale pid file
    if (pid !== null && !running) {
        await removePid();
    }

    return {
        running,
        pid: running ? pid : null,
        socketPath: SOCKET_PATH,
    };
}

/**
 * Start the daemon process.
 */
export async function startDaemon(): Promise<DaemonStatus> {
    const status = await getDaemonStatus();

    if (status.running) {
        return status;
    }

    await ensureDobbieDir();

    // Remove stale socket
    try {
        await fs.unlink(SOCKET_PATH);
    } catch (err) {
        debug('daemon', err);
        // Ignore
    }

    // Start the service process
    // In SEA binary mode, re-invoke ourselves; in dev mode, use node + script path
    const isSEA = !process.execPath.endsWith('node') && !process.execPath.endsWith('node.exe');

    const logStream = await fs.open(LOG_FILE, 'a');

    let child: ChildProcess;
    if (isSEA) {
        // SEA binary: re-spawn the same executable
        child = spawn(process.execPath, ['service', '_run'], {
            detached: true,
            stdio: ['ignore', logStream.fd, logStream.fd],
            env: { ...process.env, DOBBIE_SERVICE: '1' },
        });
    } else {
        // Dev mode: invoke node with the service entry point
        const serviceScript = path.join(import.meta.dirname, 'index.js');
        child = spawn('node', [serviceScript], {
            detached: true,
            stdio: ['ignore', logStream.fd, logStream.fd],
            env: { ...process.env, DOBBIE_SERVICE: '1' },
        });
    }

    child.unref();

    if (child.pid) {
        await writePid(child.pid);
    }

    await logStream.close();

    // Wait a moment for service to start
    await new Promise(resolve => setTimeout(resolve, 500));

    return getDaemonStatus();
}

/**
 * Stop the daemon process.
 */
export async function stopDaemon(): Promise<DaemonStatus> {
    const status = await getDaemonStatus();

    if (!status.running || status.pid === null) {
        return { running: false, pid: null, socketPath: SOCKET_PATH };
    }

    try {
        // Send SIGTERM for graceful shutdown
        process.kill(status.pid, 'SIGTERM');

        // Wait for process to exit (max 5 seconds)
        for (let i = 0; i < 50; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!isProcessRunning(status.pid)) {
                break;
            }
        }

        // Force kill if still running
        if (isProcessRunning(status.pid)) {
            process.kill(status.pid, 'SIGKILL');
        }
    } catch (err) {
        debug('daemon', err);
        // Process might have already exited
    }

    await removePid();

    // Remove socket
    try {
        await fs.unlink(SOCKET_PATH);
    } catch (err) {
        debug('daemon', err);
        // Ignore
    }

    return { running: false, pid: null, socketPath: SOCKET_PATH };
}

export { SOCKET_PATH, PID_FILE, LOG_FILE, DOBBIE_DIR };
