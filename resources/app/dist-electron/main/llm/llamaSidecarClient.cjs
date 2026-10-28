'use strict';
/**
 * Llama sidecar client.
 *
 * Spawns `llamaWorker.cjs` in a dedicated Node process
 * (`ELECTRON_RUN_AS_NODE=1`) and exposes a small proxy API that mirrors the
 * parts of `node-llama-cpp` used by `LlmManager`:
 *
 *   const { getLlama, LlamaCompletion, createModelDownloader } =
 *       await importNodeLlamaCpp();
 *
 * The native addon is never loaded in the Electron main process, so a fatal
 * V8 sandbox crash only terminates the worker.
 *
 * @module llamaSidecarClient
 */

const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKER_FILENAME = 'llamaWorker.cjs';
const START_TIMEOUT_MS = 30_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DISPOSE_TIMEOUT_MS = 3_000;

/**
 * Build the NODE_PATH entries that let the worker resolve `node-llama-cpp`
 * from the app's `node_modules` (and from the asar-unpacked tree when present).
 */
function getWorkerNodePaths() {
    const candidates = [
        path.join(__dirname, '..', '..', '..', 'node_modules'),
        path.join(__dirname, '..', '..', '..', '..', 'app.asar.unpacked', 'node_modules'),
    ];
    return candidates.filter((candidate) => {
        try {
            return fs.existsSync(candidate);
        }
        catch {
            return false;
        }
    });
}

class LlamaSidecarClient {
    constructor() {
        /** @type {import('child_process').ChildProcess | null} */
        this.worker = null;
        /** @type {Promise<void> | null} */
        this.startPromise = null;
        this.nextId = 1;
        /** @type {Map<number, { resolve: Function, reject: Function, timer: NodeJS.Timeout | null, onProgress?: Function, cleanup?: Function }>} */
        this.pending = new Map();
        /** @type {Error | null} */
        this.lastError = null;
        /** Tail of the worker's stderr, used to surface native crash details. */
        this.stderrTail = '';
    }

    isRunning() {
        return this.worker !== null && this.worker.exitCode === null && !this.worker.killed;
    }

    /**
     * Ensure the worker process is running and has sent its `ready` message.
     */
    async start() {
        if (this.isRunning()) {
            return;
        }
        if (this.startPromise) {
            return this.startPromise;
        }
        this.startPromise = this._spawn();
        try {
            await this.startPromise;
        }
        finally {
            this.startPromise = null;
        }
    }

    _spawn() {
        return new Promise((resolve, reject) => {
            const workerPath = path.join(__dirname, WORKER_FILENAME);
            if (!fs.existsSync(workerPath)) {
                reject(new Error(`Llama worker not found at ${workerPath}`));
                return;
            }

            const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
            const unpackedEntry = path.join(
                __dirname,
                '..',
                '..',
                '..',
                '..',
                'app.asar.unpacked',
                'node_modules',
                'node-llama-cpp',
                'dist',
                'index.js',
            );
            if (fs.existsSync(unpackedEntry)) {
                env.LLAMA_CPP_MODULE_ENTRY = unpackedEntry;
            }
            const nodePaths = getWorkerNodePaths();
            if (nodePaths.length > 0) {
                const joined = nodePaths.join(path.delimiter);
                env.NODE_PATH = env.NODE_PATH
                    ? `${joined}${path.delimiter}${env.NODE_PATH}`
                    : joined;
            }

            let worker;
            try {
                worker = fork(workerPath, [], {
                    env,
                    execPath: process.execPath,
                    execArgv: [],
                    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
                });
            }
            catch (error) {
                reject(error);
                return;
            }

            this.worker = worker;
            this.lastError = null;
            this.stderrTail = '';

            let settled = false;
            const settle = (fn, value) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                fn(value);
            };

            const timer = setTimeout(() => {
                settle(reject, new Error(`Llama worker did not become ready within ${START_TIMEOUT_MS}ms`));
                try {
                    worker.kill();
                }
                catch {
                    // ignore
                }
            }, START_TIMEOUT_MS);

            worker.on('message', (msg) => {
                if (msg && msg.type === 'ready') {
                    settle(resolve);
                    return;
                }
                this._handleMessage(msg);
            });

            worker.on('error', (error) => {
                this.lastError = error;
                settle(reject, error);
                this._failAll(error);
            });

            worker.on('exit', (code, signal) => {
                const tail = this.stderrTail.trim();
                const error = new Error(
                    `Llama worker exited (code=${code}, signal=${signal})` +
                        (tail ? `\n${tail}` : ''),
                );
                this.lastError = error;
                if (this.worker === worker) {
                    this.worker = null;
                }
                settle(reject, error);
                this._failAll(error);
            });

            // Drain the worker's stdio so it never blocks on a full pipe.
            if (worker.stdout) {
                worker.stdout.on('data', (chunk) => {
                    process.stderr.write(`[llamaWorker] ${chunk}`);
                });
            }
            if (worker.stderr) {
                worker.stderr.on('data', (chunk) => {
                    const text = String(chunk);
                    this.stderrTail = (this.stderrTail + text).slice(-8192);
                    process.stderr.write(`[llamaWorker] ${text}`);
                });
            }
        });
    }

    _toError(payload, fallbackMessage) {
        const error = new Error(payload?.message || fallbackMessage);
        if (payload?.name) {
            error.name = payload.name;
        }
        if (payload?.stack) {
            error.stack = payload.stack;
        }
        return error;
    }

    _handleMessage(msg) {
        if (!msg || typeof msg !== 'object') {
            return;
        }
        if (msg.type === 'fatal') {
            const error = this._toError(msg.error, 'Llama worker crashed');
            this.lastError = error;
            this._failAll(error);
            return;
        }
        const entry = this.pending.get(msg.id);
        if (!entry) {
            return;
        }
        if (msg.type === 'progress') {
            try {
                entry.onProgress?.(msg.progress);
            }
            catch {
                // Progress callbacks must never break the IPC loop.
            }
            return;
        }
        this.pending.delete(msg.id);
        if (entry.timer) {
            clearTimeout(entry.timer);
        }
        if (entry.cleanup) {
            entry.cleanup();
        }
        if (msg.type === 'error') {
            entry.reject(this._toError(msg.error, 'Llama worker request failed'));
        }
        else {
            entry.resolve(msg.result);
        }
    }

    _failAll(error) {
        for (const [id, entry] of this.pending) {
            this.pending.delete(id);
            if (entry.timer) {
                clearTimeout(entry.timer);
            }
            if (entry.cleanup) {
                entry.cleanup();
            }
            entry.reject(error);
        }
    }

    /**
     * Send a request to the worker and await its result.
     *
     * @param {string} type
     * @param {object} payload
     * @param {{ timeoutMs?: number, onProgress?: Function, signal?: AbortSignal }} [options]
     */
    request(type, payload = {}, options = {}) {
        const {
            timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
            onProgress,
            signal,
        } = options;

        return this.start().then(() => new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Llama worker is not running'));
                return;
            }
            if (signal?.aborted) {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
                return;
            }

            const id = this.nextId++;
            let timer = null;
            let cleanup = null;

            if (timeoutMs > 0) {
                timer = setTimeout(() => {
                    this.pending.delete(id);
                    if (cleanup) {
                        cleanup();
                    }
                    reject(new Error(`Llama worker request "${type}" timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }

            if (signal) {
                const onAbort = () => {
                    try {
                        this.worker?.send({ id: this.nextId++, type: 'abort', targetId: id });
                    }
                    catch {
                        // ignore
                    }
                };
                signal.addEventListener('abort', onAbort, { once: true });
                cleanup = () => signal.removeEventListener('abort', onAbort);
            }

            this.pending.set(id, { resolve, reject, timer, onProgress, cleanup });

            try {
                this.worker.send({ id, type, ...payload });
            }
            catch (error) {
                this.pending.delete(id);
                if (timer) {
                    clearTimeout(timer);
                }
                if (cleanup) {
                    cleanup();
                }
                reject(error);
            }
        }));
    }

    /**
     * Gracefully dispose the worker and terminate the child process.
     */
    async stop() {
        const worker = this.worker;
        if (!worker) {
            return;
        }
        try {
            await this.request('dispose', {}, { timeoutMs: DISPOSE_TIMEOUT_MS });
        }
        catch {
            // The worker may already be gone.
        }
        try {
            worker.kill();
        }
        catch {
            // ignore
        }
        if (this.worker === worker) {
            this.worker = null;
        }
    }

    /**
     * Synchronous best-effort kill, safe to call from `process.on('exit')`.
     */
    stopSync() {
        const worker = this.worker;
        this.worker = null;
        if (worker) {
            try {
                worker.kill();
            }
            catch {
                // ignore
            }
        }
    }
}

/** @type {LlamaSidecarClient | null} */
let client = null;

function getClient() {
    if (!client) {
        client = new LlamaSidecarClient();
    }
    return client;
}

/**
 * Proxy for `getLlama()` from node-llama-cpp.
 */
async function getLlama(options = {}) {
    const sidecar = getClient();
    await sidecar.request(
        'init',
        { gpuMode: options.gpu ?? false },
        { timeoutMs: 120_000 },
    );

    return {
        async loadModel({ modelPath }) {
            await sidecar.request(
                'loadModel',
                { modelPath },
                { timeoutMs: 300_000 },
            );
            return {
                async createContext(contextOptions = {}) {
                    // The worker creates the context as part of `loadModel`.
                    // This proxy only exposes the sequence handle that
                    // `LlamaCompletion` expects.
                    void contextOptions;
                    return {
                        getSequence() {
                            return { __llamaSidecarSequence: true };
                        },
                        dispose() {
                            // Disposed together with the model.
                        },
                    };
                },
                dispose() {
                    // Disposed together with the llama instance.
                },
            };
        },
        dispose() {
            // `LlmManager.dispose()` is synchronous, so fire and forget.
            void sidecar.stop();
        },
    };
}

/**
 * Proxy for `LlamaCompletion` from node-llama-cpp.
 */
class LlamaCompletion {
    constructor({ contextSequence } = {}) {
        this.contextSequence = contextSequence;
    }

    async generateCompletion(partialText, options = {}) {
        const { signal, ...serializableOptions } = options;
        const result = await getClient().request(
            'generateCompletion',
            { partialText, options: serializableOptions },
            { timeoutMs: 60_000, signal },
        );
        return result?.result ?? null;
    }
}

/**
 * Proxy for `createModelDownloader()` from node-llama-cpp.
 */
async function createModelDownloader({ modelUri, dirPath, showCliProgress, onProgress } = {}) {
    const sidecar = getClient();
    return {
        async download({ signal } = {}) {
            const result = await sidecar.request(
                'downloadModel',
                { modelUri, dirPath, showCliProgress: showCliProgress === true },
                { timeoutMs: 0, onProgress, signal },
            );
            return result?.path ?? null;
        },
    };
}

/**
 * Stop the sidecar worker (async).
 */
async function stopSidecar() {
    if (!client) {
        return;
    }
    await client.stop();
}

/**
 * Stop the sidecar worker synchronously (best effort).
 */
function stopSidecarSync() {
    if (client) {
        client.stopSync();
    }
}

module.exports = {
    getLlama,
    LlamaCompletion,
    createModelDownloader,
    getClient,
    stopSidecar,
    stopSidecarSync,
    LlamaSidecarClient,
};
