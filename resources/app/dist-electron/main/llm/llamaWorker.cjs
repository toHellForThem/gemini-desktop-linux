'use strict';
/**
 * node-llama-cpp sidecar worker.
 *
 * This script is executed in a dedicated child process (see
 * `llamaSidecarClient.cjs`) with `ELECTRON_RUN_AS_NODE=1`. Keeping the native
 * addon out of the Electron main process means a fatal V8 sandbox crash
 * (`v8_ArrayBuffer_NewBackingStore`) only kills this worker instead of the
 * whole application window.
 *
 * Protocol (parent -> worker):
 *   { id, type: 'init', gpuMode }
 *   { id, type: 'loadModel', modelPath, contextOptions? }
 *   { id, type: 'generateCompletion', partialText, options }
 *   { id, type: 'downloadModel', modelUri, dirPath, showCliProgress? }
 *   { id, type: 'abort', targetId }
 *   { id, type: 'dispose' }
 *
 * Protocol (worker -> parent):
 *   { type: 'ready' }
 *   { id, type: 'result', result }
 *   { id, type: 'error', error: { name, message, stack } }
 *   { id, type: 'progress', progress: { downloadedSize, totalSize, percent } }
 *   { type: 'fatal', error: { name, message, stack } }
 *
 * @module llamaWorker
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

/** @type {import('node-llama-cpp').Llama | null} */
let llama = null;
/** @type {import('node-llama-cpp').LlamaModel | null} */
let model = null;
/** @type {import('node-llama-cpp').LlamaContext | null} */
let context = null;
/** @type {import('node-llama-cpp').LlamaCompletion | null} */
let completion = null;
/** @type {typeof import('node-llama-cpp').LlamaCompletion | null} */
let LlamaCompletionCtor = null;

/** Abort controllers keyed by the request id that created them. */
const abortControllers = new Map();

function send(message) {
    if (typeof process.send === 'function') {
        try {
            process.send(message);
        }
        catch {
            // Parent is gone — nothing useful we can do here.
        }
    }
}

function sendResult(id, result) {
    send({ id, type: 'result', result });
}

function sendError(id, error) {
    const err = error instanceof Error ? error : new Error(String(error));
    send({
        id,
        type: 'error',
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        },
    });
}

function sendProgress(id, progress) {
    send({ id, type: 'progress', progress });
}

/**
 * Candidate entry points for the ESM-only node-llama-cpp package.
 *
 * The app directory can contain a partial copy of the package (only the
 * directories that were unpacked from the asar), while the complete package
 * lives in `app.asar.unpacked`. Prefer the complete copy, then fall back to
 * normal module resolution.
 */
function getModuleEntryCandidates() {
    const candidates = [];
    if (process.env.LLAMA_CPP_MODULE_ENTRY) {
        candidates.push(process.env.LLAMA_CPP_MODULE_ENTRY);
    }
    candidates.push(path.join(
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
    ));
    try {
        candidates.push(require.resolve('node-llama-cpp'));
    }
    catch {
        // Ignore — the explicit candidates above may still work.
    }
    return candidates;
}

/**
 * Import the ESM-only node-llama-cpp package from this CommonJS worker.
 *
 * The resolved path is imported as a file URL, which avoids relying on
 * bare-specifier ESM resolution quirks in Electron's Node mode.
 */
async function importNodeLlamaCpp() {
    for (const candidate of getModuleEntryCandidates()) {
        try {
            if (!candidate || !fs.existsSync(candidate)) {
                continue;
            }
            return await import(pathToFileURL(candidate).href);
        }
        catch (error) {
            const code = error && error.code;
            if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') {
                continue;
            }
            // A real load failure (e.g. missing native binary) must surface.
            throw error;
        }
    }
    return import('node-llama-cpp');
}

/**
 * Release every native resource held by the worker.
 */
function disposeAll() {
    try {
        completion = null;
    }
    catch {
        // ignore
    }
    try {
        context?.dispose();
    }
    catch {
        // ignore
    }
    try {
        model?.dispose();
    }
    catch {
        // ignore
    }
    try {
        llama?.dispose();
    }
    catch {
        // ignore
    }
    completion = null;
    context = null;
    model = null;
    llama = null;
}

async function handleInit(msg) {
    // A previous init may have succeeded before a GPU fallback retry.
    disposeAll();
    const mod = await importNodeLlamaCpp();
    LlamaCompletionCtor = mod.LlamaCompletion;
    llama = await mod.getLlama({
        gpu: msg.gpuMode ?? false,
        build: 'never',
    });
    return { gpuMode: msg.gpuMode ?? false };
}

async function handleLoadModel(msg) {
    if (!llama) {
        throw new Error('Llama worker is not initialized. Send "init" first.');
    }
    if (!msg.modelPath) {
        throw new Error('loadModel requires a modelPath');
    }
    // Drop any previously loaded model/context before loading a new one.
    try {
        completion = null;
    }
    catch {
        // ignore
    }
    try {
        context?.dispose();
    }
    catch {
        // ignore
    }
    try {
        model?.dispose();
    }
    catch {
        // ignore
    }
    context = null;
    model = null;
    completion = null;
    model = await llama.loadModel({ modelPath: msg.modelPath });
    context = await model.createContext(msg.contextOptions ?? {});
    if (!LlamaCompletionCtor) {
        const mod = await importNodeLlamaCpp();
        LlamaCompletionCtor = mod.LlamaCompletion;
    }
    completion = new LlamaCompletionCtor({
        contextSequence: context.getSequence(),
    });
    return { modelPath: msg.modelPath };
}

async function handleGenerateCompletion(msg) {
    if (!completion) {
        throw new Error('Model is not loaded. Send "loadModel" first.');
    }
    const controller = new AbortController();
    if (msg.id != null) {
        abortControllers.set(msg.id, controller);
    }
    try {
        const result = await completion.generateCompletion(msg.partialText, {
            ...(msg.options ?? {}),
            signal: controller.signal,
        });
        return { result };
    }
    finally {
        if (msg.id != null) {
            abortControllers.delete(msg.id);
        }
    }
}

async function handleDownloadModel(msg) {
    const { createModelDownloader } = await importNodeLlamaCpp();
    const controller = new AbortController();
    if (msg.id != null) {
        abortControllers.set(msg.id, controller);
    }
    try {
        const downloader = await createModelDownloader({
            modelUri: msg.modelUri,
            dirPath: msg.dirPath,
            showCliProgress: msg.showCliProgress === true,
            onProgress: (status) => {
                const totalSize = status.totalSize ?? 0;
                const downloadedSize = status.downloadedSize ?? 0;
                sendProgress(msg.id, {
                    downloadedSize,
                    totalSize,
                    percent: totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0,
                });
            },
        });
        const downloadedPath = await downloader.download({ signal: controller.signal });
        return { path: downloadedPath };
    }
    finally {
        if (msg.id != null) {
            abortControllers.delete(msg.id);
        }
    }
}

function handleAbort(msg) {
    const controller = abortControllers.get(msg.targetId);
    if (controller) {
        controller.abort();
    }
    return { aborted: Boolean(controller) };
}

async function handleDispose() {
    disposeAll();
    return { disposed: true };
}

const handlers = {
    init: handleInit,
    loadModel: handleLoadModel,
    generateCompletion: handleGenerateCompletion,
    downloadModel: handleDownloadModel,
    abort: handleAbort,
    dispose: handleDispose,
};

process.on('message', async (msg) => {
    if (!msg || typeof msg !== 'object') {
        return;
    }
    const handler = handlers[msg.type];
    if (!handler) {
        sendError(msg.id, new Error(`Unknown llama worker command: ${String(msg.type)}`));
        return;
    }
    try {
        const result = await handler(msg);
        sendResult(msg.id, result);
        if (msg.type === 'dispose') {
            // Give the IPC message a chance to flush before exiting.
            setTimeout(() => process.exit(0), 50);
        }
    }
    catch (error) {
        sendError(msg.id, error);
    }
});

process.on('uncaughtException', (error) => {
    send({
        type: 'fatal',
        error: {
            name: error?.name ?? 'Error',
            message: error?.message ?? String(error),
            stack: error?.stack,
        },
    });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    send({
        type: 'fatal',
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
    });
    process.exit(1);
});

// If the parent disappears, do not linger as an orphan process.
process.on('disconnect', () => {
    process.exit(0);
});

send({ type: 'ready' });
