"use strict";
/**
 * LLM Manager for the Electron main process.
 *
 * Handles local LLM inference using node-llama-cpp for text prediction.
 * Manages model download, loading, GPU acceleration, and inference.
 *
 * @module LlmManager
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL_ID = exports.MODEL_REGISTRY = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs_1 = require("fs");
const logger_1 = require("../utils/logger.cjs");
const sandboxDetector_1 = require("../utils/sandboxDetector.cjs");
const llamaSidecarClient_1 = require("../llm/llamaSidecarClient.cjs");
const logger = (0, logger_1.createLogger)('[LlmManager]');
/**
 * Resolve the node-llama-cpp API used by this manager.
 *
 * The native addon is never loaded in the Electron main process: on kernels
 * with an active V8 sandbox it crashes with `v8_ArrayBuffer_NewBackingStore`.
 * Instead, `llamaSidecarClient` forks `llm/llamaWorker.cjs` in a separate Node
 * process (`ELECTRON_RUN_AS_NODE=1`) and proxies the calls over IPC.
 *
 * The returned object exposes the same surface this manager uses:
 *   - `getLlama({ gpu, build })`
 *   - `LlamaCompletion`
 *   - `createModelDownloader({ modelUri, dirPath, onProgress })`
 */
async function importNodeLlamaCpp() {
    if (process.env.NODE_ENV === 'test') {
        // Tests run in plain Node, where loading the ESM module directly is safe.
        return Promise.resolve().then(() => __importStar(require('node-llama-cpp')));
    }
    return llamaSidecarClient_1;
}
/**
 * Locate node-llama-cpp's package.json.
 *
 * The app directory may contain a partial copy of the package (only the
 * directories that were unpacked from the asar), while the complete package
 * lives in `app.asar.unpacked`. Prefer the complete copy.
 */
function resolveNodeLlamaCppPackageJson() {
    const candidates = [];
    try {
        candidates.push(path.join(electron_1.app.getAppPath(), '..', 'app.asar.unpacked', 'node_modules', 'node-llama-cpp', 'package.json'));
    }
    catch {
        // ignore
    }
    try {
        candidates.push(path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'node-llama-cpp', 'package.json'));
    }
    catch {
        // ignore
    }
    try {
        candidates.push(require.resolve('node-llama-cpp/package.json'));
    }
    catch {
        // ignore
    }
    for (const candidate of candidates) {
        try {
            if (candidate && (0, fs_1.existsSync)(candidate)) {
                return candidate;
            }
        }
        catch {
            // ignore
        }
    }
    throw new Error('node-llama-cpp package.json not found');
}
/**
 * Registry of supported models.
 * Add new models here to extend LLM support.
 *
 * Using Qwen3 family for text completion:
 * - Qwen3-0.6B: Ultra-lightweight, fastest inference
 * - Qwen3-1.7B: Good balance of quality and speed (default)
 * - Qwen3-4B: Higher quality predictions
 */
exports.MODEL_REGISTRY = {
    'qwen3-0.6b': {
        id: 'qwen3-0.6b',
        displayName: 'Qwen3 0.6B',
        // Official Qwen GGUF - no authentication required
        uri: 'hf:Qwen/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q8_0.gguf',
        // Note: node-llama-cpp prefixes the filename with the HF org name
        fileName: 'hf_Qwen_Qwen3-0.6B-Q8_0.gguf',
        sizeBytes: 640_000_000, // ~640 MB (q8_0 quantization)
    },
    'qwen3-1.7b': {
        id: 'qwen3-1.7b',
        displayName: 'Qwen3 1.7B',
        // Official Qwen GGUF - no authentication required
        uri: 'hf:Qwen/Qwen3-1.7B-GGUF/Qwen3-1.7B-Q8_0.gguf',
        // Note: node-llama-cpp prefixes the filename with the HF org name
        fileName: 'hf_Qwen_Qwen3-1.7B-Q8_0.gguf',
        sizeBytes: 1_800_000_000, // ~1.8 GB (q8_0 quantization)
    },
    'qwen3-4b': {
        id: 'qwen3-4b',
        displayName: 'Qwen3 4B',
        // Official Qwen GGUF - no authentication required
        uri: 'hf:Qwen/Qwen3-4B-GGUF/Qwen3-4B-Q4_K_M.gguf',
        // Note: node-llama-cpp prefixes the filename with the HF org name
        fileName: 'hf_Qwen_Qwen3-4B-Q4_K_M.gguf',
        sizeBytes: 2_560_000_000, // ~2.56 GB (Q4_K_M quantization)
    },
};
/** Default model to use for text prediction (0.6B for lower memory requirements) */
exports.DEFAULT_MODEL_ID = 'qwen3-0.6b';
/**
 * LlmManager handles local LLM text prediction.
 *
 * Features:
 * - On-demand model download from Hugging Face
 * - GPU acceleration support with CPU fallback
 * - Text prediction inference
 * - Status tracking and events
 * - Extensible model registry for multiple LLM support
 */
class LlmManager {
    status = 'not-downloaded';
    gpuEnabled = false;
    errorMessage = null;
    downloadProgress = 0;
    currentModelId = exports.DEFAULT_MODEL_ID;
    modelPath = null;
    abortController = null;
    nativeAvailable = null;
    nativeProbeError = null;
    nativeVersion = null;
    // node-llama-cpp instances
    llama = null;
    model = null;
    context = null;
    completion = null;
    // Status change listeners
    statusListeners = [];
    constructor() {
        logger.log('LlmManager created');
    }
    isTextPredictionTestMode() {
        return process.argv.includes('--test-text-prediction');
    }
    ensureNativeAvailable(context) {
        if (this.nativeAvailable !== null) {
            return this.nativeAvailable;
        }
        // The native addon now runs in an isolated sidecar process, so the
        // main-process V8 sandbox no longer blocks text prediction. This guard
        // is kept for API compatibility and always evaluates to false; the
        // probe below only reads package.json and never loads the addon.
        if ((0, sandboxDetector_1.isV8SandboxIncompatibleKernel)()) {
            this.nativeAvailable = false;
            this.nativeProbeError =
                'Local AI text prediction is disabled on Linux kernel 7+ due to a V8 sandbox incompatibility.';
            logger.warn('Native module probe skipped — incompatible Linux kernel (V8 sandbox)', { context });
            return false;
        }
        if (process.env.NODE_ENV === 'test') {
            this.nativeAvailable = true;
            return true;
        }
        if (process.env.CI === 'true' || process.argv.includes('--integration-test')) {
            this.nativeAvailable = false;
            this.nativeProbeError = 'Native module operations disabled in CI or integration tests.';
            logger.warn('Native module probe blocked by environment', {
                context,
                ci: process.env.CI === 'true',
                integrationTest: process.argv.includes('--integration-test'),
            });
            return false;
        }
        if (process.type && process.type !== 'browser') {
            this.nativeAvailable = false;
            this.nativeProbeError = `node-llama-cpp must run in main process, got process.type=${process.type}`;
            logger.error('Native module probe failed (not main process)', {
                context,
                processType: process.type,
            });
            return false;
        }
        try {
            this.nativeAvailable = true;
            this.nativeProbeError = null;
            const pkgPath = resolveNodeLlamaCppPackageJson();
            const pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
            this.nativeVersion = pkg.version ?? null;
            if (!this.nativeVersion) {
                this.nativeAvailable = false;
                this.nativeProbeError = 'node-llama-cpp version missing in package.json';
                logger.warn('Native module probe failed (missing version)', {
                    context,
                    packageJsonPath: pkgPath,
                });
                return false;
            }
            this.nativeAvailable = true;
            this.nativeProbeError = null;
            logger.log('Native module probe succeeded', {
                context,
                version: this.nativeVersion,
                packageJsonPath: pkgPath,
            });
            return true;
        }
        catch (error) {
            const errorCode = error instanceof Error ? error.code : undefined;
            const isPackageJsonExportError = error instanceof Error &&
                (errorCode === 'ERR_PACKAGE_PATH_NOT_EXPORTED' ||
                    error.message.includes("Package subpath './package.json'"));
            if (isPackageJsonExportError) {
                try {
                    const moduleEntry = require.resolve('node-llama-cpp');
                    if (!(0, fs_1.existsSync)(moduleEntry)) {
                        throw new Error(`node-llama-cpp entrypoint not found: ${moduleEntry}`);
                    }
                    this.nativeAvailable = true;
                    this.nativeVersion = null;
                    this.nativeProbeError = null;
                    logger.log('Native module probe using entrypoint fallback', {
                        context,
                        moduleEntry,
                    });
                    return true;
                }
                catch (resolveError) {
                    this.nativeAvailable = false;
                    this.nativeProbeError =
                        resolveError instanceof Error ? resolveError.message : 'node-llama-cpp not found';
                    logger.warn('Native module probe failed (entrypoint resolve failed)', {
                        context,
                        error: this.nativeProbeError,
                        originalError: error instanceof Error ? error.message : String(error),
                    });
                    return false;
                }
            }
            this.nativeAvailable = false;
            this.nativeProbeError = error instanceof Error ? error.message : 'node-llama-cpp not found';
            const appPath = typeof electron_1.app.getAppPath === 'function' ? electron_1.app.getAppPath() : 'unknown';
            const isPackaged = typeof electron_1.app.isPackaged === 'boolean' ? electron_1.app.isPackaged : false;
            logger.warn('Native module probe failed', {
                context,
                error: this.nativeProbeError,
                appPath,
                isPackaged,
            });
            return false;
        }
    }
    isNativeAvailable(context = 'isNativeAvailable') {
        if (this.nativeAvailable === null) {
            return this.ensureNativeAvailable(context);
        }
        return this.nativeAvailable === true;
    }
    /**
     * Register a listener for status changes.
     */
    onStatusChange(callback) {
        this.statusListeners.push(callback);
        return () => {
            this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
        };
    }
    /**
     * Update status and notify listeners.
     */
    setStatus(status, errorMessage) {
        this.status = status;
        this.errorMessage = errorMessage ?? null;
        logger.log('Status changed', { status, errorMessage });
        this.statusListeners.forEach((cb) => cb(status, errorMessage));
    }
    /**
     * Get the directory where models are stored.
     */
    getModelsDirectory() {
        return path.join(electron_1.app.getPath('userData'), 'models');
    }
    /**
     * Validate that a model ID exists in the registry and return its config.
     * @throws Error if model ID is unknown
     */
    validateModelId(modelId) {
        const config = exports.MODEL_REGISTRY[modelId];
        if (!config) {
            throw new Error(`Unknown model: ${modelId}`);
        }
        return config;
    }
    /**
     * Get the full path for a model file.
     */
    getModelPath(modelId) {
        const config = this.validateModelId(modelId);
        return path.join(this.getModelsDirectory(), config.fileName);
    }
    /**
     * Check if a model is already downloaded.
     */
    isModelDownloaded(modelId = this.currentModelId) {
        try {
            const modelPath = this.getModelPath(modelId);
            return (0, fs_1.existsSync)(modelPath);
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize the LLM manager.
     * Sets up event listeners and checks existing model state.
     */
    async initialize() {
        logger.log('Initializing LlmManager');
        // Check if model already exists on disk
        if (this.isModelDownloaded()) {
            this.modelPath = this.getModelPath(this.currentModelId);
            // Don't set to 'ready' yet - model needs to be loaded first
            // Status stays 'not-downloaded' until explicitly enabled
            logger.log('Model found on disk', { modelPath: this.modelPath });
        }
    }
    /**
     * Download the specified model with progress callbacks.
     *
     * @param onProgress - Callback for progress updates (0-100)
     * @param modelId - Model to download (defaults to current model)
     * @throws Error if download fails
     */
    async downloadModel(onProgress, modelId = this.currentModelId) {
        if (!this.ensureNativeAvailable('downloadModel')) {
            const message = this.nativeProbeError ?? 'node-llama-cpp is not available';
            this.setStatus('error', message);
            throw new Error(message);
        }
        // Guard against concurrent downloads
        if (this.status === 'downloading') {
            throw new Error('Download already in progress');
        }
        const config = this.validateModelId(modelId);
        // Check if already downloaded
        if (this.isModelDownloaded(modelId)) {
            logger.log('Model already downloaded', { modelId });
            this.downloadProgress = 100;
            onProgress?.(100);
            return;
        }
        logger.log('Starting model download', {
            modelId,
            uri: config.uri,
            sizeBytes: config.sizeBytes,
        });
        this.setStatus('downloading');
        this.downloadProgress = 0;
        this.abortController = new AbortController();
        try {
            // Dynamic import for ESM module using helper to prevent transpilation
            const { createModelDownloader } = await importNodeLlamaCpp();
            const downloader = await createModelDownloader({
                modelUri: config.uri,
                dirPath: this.getModelsDirectory(),
                showCliProgress: false,
                onProgress: (status) => {
                    const percent = Math.round((status.downloadedSize / status.totalSize) * 100);
                    this.downloadProgress = percent;
                    onProgress?.(percent);
                    logger.log('Download progress', {
                        percent,
                        downloaded: status.downloadedSize,
                        total: status.totalSize,
                    });
                },
            });
            const downloadedPath = await downloader.download({
                signal: this.abortController.signal,
            });
            this.modelPath = downloadedPath;
            logger.log('Model download complete', { modelPath: this.modelPath });
            // Verify file exists
            if (!this.modelPath || !(0, fs_1.existsSync)(this.modelPath)) {
                throw new Error('Downloaded file not found after download');
            }
            this.downloadProgress = 100;
            onProgress?.(100);
            // Don't set status to 'ready' - model needs to be loaded first
            // Status will be set when loadModel() is called
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Download failed';
            // Check if it was cancelled
            if (this.abortController?.signal.aborted) {
                logger.log('Download cancelled');
                this.setStatus('not-downloaded');
                return;
            }
            logger.error('Model download failed', { error, modelId });
            this.setStatus('error', message);
            throw error;
        }
        finally {
            this.abortController = null;
        }
    }
    /**
     * Load the model into memory for inference.
     * Requires model to be downloaded first.
     *
     * @throws Error if model not downloaded or loading fails
     */
    async loadModel() {
        if (!this.ensureNativeAvailable('loadModel')) {
            const message = this.nativeProbeError ?? 'node-llama-cpp is not available';
            this.setStatus('error', message);
            throw new Error(message);
        }
        // Guard against concurrent load operations
        if (this.status === 'initializing') {
            throw new Error('Model is currently loading');
        }
        // Check if model is downloaded
        if (!this.isModelDownloaded()) {
            throw new Error('Model not downloaded. Call downloadModel() first.');
        }
        // Already loaded
        if (this.status === 'ready' && this.model && this.context) {
            logger.log('Model already loaded');
            return;
        }
        logger.log('Loading model', {
            modelId: this.currentModelId,
            gpuEnabled: this.gpuEnabled,
        });
        this.setStatus('initializing');
        try {
            // Dynamic import for ESM module using helper to prevent transpilation
            const { getLlama, LlamaCompletion } = await importNodeLlamaCpp();
            // Get llama instance with GPU setting
            const gpuMode = this.gpuEnabled ? 'auto' : false;
            logger.log('Initializing Llama with GPU mode', {
                gpuMode,
                gpuEnabled: this.gpuEnabled,
            });
            this.llama = await getLlama({
                gpu: gpuMode,
                build: 'never', // Don't build from source in Electron - users may not have build tools
            });
            logger.log('Llama instance created', {
                gpuEnabled: this.gpuEnabled,
                gpuModeRequested: gpuMode,
            });
            // Get model path
            const modelPath = this.getModelPath(this.currentModelId);
            // Load the model
            this.model = await this.llama.loadModel({
                modelPath,
            });
            // Create context for inference
            this.context = await this.model.createContext();
            // Create completion instance for text completion (not chat)
            this.completion = new LlamaCompletion({
                contextSequence: this.context.getSequence(),
            });
            this.setStatus('ready');
            logger.log('Model loaded successfully', {
                modelId: this.currentModelId,
                gpuEnabled: this.gpuEnabled,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load model';
            const isV8SandboxError = typeof message === 'string' &&
                (message.includes('v8_ArrayBuffer_NewBackingStore') ||
                    message.includes('V8 Sandbox') ||
                    message.includes('sandbox address space'));
            if (isV8SandboxError) {
                const v8Message = 'V8 sandbox conflict detected while loading the local AI engine. ' +
                    'On Linux, enabling text prediction requires disabling the V8 memory sandbox and restarting the app.';
                this.nativeAvailable = false;
                this.nativeProbeError = v8Message;
                this.setStatus('error', v8Message);
                logger.error('Failed to load model due to V8 sandbox conflict', { error });
                throw new Error(v8Message);
            }
            logger.error('Failed to load model', { error });
            // If GPU failed, try CPU fallback
            if (this.gpuEnabled) {
                logger.warn('GPU load failed, attempting CPU fallback');
                try {
                    this.gpuEnabled = false;
                    // Reset the status so the recursive loadModel() call is not
                    // rejected by the "Model is currently loading" guard.
                    this.setStatus('not-downloaded');
                    await this.loadModel();
                    return;
                }
                catch (cpuError) {
                    logger.error('CPU fallback also failed', { error: cpuError });
                }
            }
            this.setStatus('error', message);
            throw error;
        }
    }
    /**
     * Unload the model from memory to free resources.
     */
    unloadModel() {
        logger.log('Unloading model');
        if (this.completion) {
            // Completion doesn't have dispose, just nullify
            this.completion = null;
        }
        if (this.context) {
            this.context.dispose();
            this.context = null;
        }
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        if (this.llama) {
            this.llama.dispose();
            this.llama = null;
        }
        // Model is unloaded but may still be on disk - set status to not-downloaded
        // (user can call loadModel() again if the file exists)
        this.setStatus('not-downloaded');
        logger.log('Model unloaded');
    }
    /**
     * Check if the model is currently loaded and ready for inference.
     */
    isModelLoaded() {
        return this.status === 'ready' && this.model !== null && this.context !== null;
    }
    /**
     * Get the loaded model (for advanced use cases).
     */
    getLoadedModel() {
        return this.model;
    }
    /**
     * Get the inference context (for advanced use cases).
     */
    getContext() {
        return this.context;
    }
    /**
     * Default timeout for inference in milliseconds.
     * Increased to 2000ms for larger Qwen3 models.
     */
    static INFERENCE_TIMEOUT_MS = 2000;
    /**
     * Generate a text prediction for the given partial text.
     *
     * @param partialText - The text to complete
     * @param timeoutMs - Maximum time to wait for inference (default: 500ms)
     * @returns The predicted continuation, or null if model not ready or timeout
     */
    async predict(partialText, timeoutMs) {
        if (this.isTextPredictionTestMode()) {
            logger.log('Text prediction test mode active; returning stub prediction');
            return 'test prediction';
        }
        // Return null if model not ready
        if (!this.isModelLoaded() || !this.completion) {
            logger.warn('Predict called but model not ready');
            return null;
        }
        // Validate input
        if (!partialText || partialText.trim().length === 0) {
            return null;
        }
        const timeout = timeoutMs ?? LlmManager.INFERENCE_TIMEOUT_MS;
        logger.log('Starting prediction', {
            partialTextLength: partialText.length,
            timeoutMs: timeout,
        });
        // Create abort controller for timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);
        try {
            // Use direct text completion - no chat template, just continue the input
            logger.log('Generating completion', { partialText });
            const completion = await this.completion.generateCompletion(partialText, {
                signal: abortController.signal,
                maxTokens: 10, // Limit tokens for quick suggestions (3-4 words)
                temperature: 0.7, // Slightly creative but not too random
            });
            logger.log('Raw model response', { completion, partialText });
            // The completion should just be the continuation (no input echo)
            const cleaned = completion?.trim() ?? null;
            logger.log('Prediction complete', {
                inputLength: partialText.length,
                outputLength: cleaned?.length ?? 0,
                cleanedResult: cleaned,
            });
            return cleaned || null;
        }
        catch (error) {
            // Check if it was a timeout/abort
            if (error instanceof Error && error.name === 'AbortError') {
                logger.log('Prediction timed out', { timeoutMs: timeout });
                return null;
            }
            logger.error('Prediction failed', { error });
            return null;
        }
        finally {
            // Always clean up the timeout to prevent memory leaks
            clearTimeout(timeoutId);
        }
    }
    /**
     * Cancel an in-progress download.
     */
    cancelDownload() {
        if (this.abortController) {
            logger.log('Cancelling download');
            this.abortController.abort();
        }
    }
    /**
     * Get the current download progress (0-100).
     */
    getDownloadProgress() {
        return this.downloadProgress;
    }
    /**
     * Set the current model to use.
     * If a model is currently loaded, it will be unloaded.
     */
    setCurrentModel(modelId) {
        this.validateModelId(modelId);
        // Unload current model if switching
        if (this.currentModelId !== modelId && this.isModelLoaded()) {
            this.unloadModel();
        }
        this.currentModelId = modelId;
        logger.log('Current model set', { modelId });
    }
    /**
     * Get the current model ID.
     */
    getCurrentModelId() {
        return this.currentModelId;
    }
    /**
     * Get configuration for a specific model.
     */
    getModelConfig(modelId = this.currentModelId) {
        return exports.MODEL_REGISTRY[modelId];
    }
    /**
     * Get all available models.
     */
    getAvailableModels() {
        return Object.values(exports.MODEL_REGISTRY);
    }
    /**
     * Dispose of the LLM manager.
     * Releases resources and unloads the model.
     */
    dispose() {
        logger.log('Disposing LlmManager');
        this.cancelDownload();
        this.unloadModel();
        // Make sure the sidecar process never outlives the app.
        llamaSidecarClient_1.stopSidecarSync();
        this.statusListeners = [];
    }
    /**
     * Get the current model status.
     */
    getStatus() {
        return this.status;
    }
    getNativeProbeError() {
        return this.nativeProbeError;
    }
    /**
     * Get the current error message, if any.
     */
    getErrorMessage() {
        return this.errorMessage;
    }
    /**
     * Check if GPU acceleration is enabled.
     */
    isGpuEnabled() {
        return this.gpuEnabled;
    }
    /**
     * Enable or disable GPU acceleration.
     * Requires model reload to take effect.
     *
     * @param enabled - Whether to enable GPU acceleration
     */
    setGpuEnabled(enabled) {
        if (this.gpuEnabled === enabled) {
            return;
        }
        this.gpuEnabled = enabled;
        logger.log('GPU acceleration setting changed', { enabled });
        // Note: Requires reload to take effect
        // Caller should call unloadModel() then loadModel() if model is currently loaded
    }
}
exports.default = LlmManager;
