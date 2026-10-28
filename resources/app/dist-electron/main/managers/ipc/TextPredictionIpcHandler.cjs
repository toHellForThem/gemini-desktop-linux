"use strict";
/**
 * Text Prediction IPC Handler.
 *
 * Handles IPC channels for text prediction (local LLM) operations:
 * - text-prediction:get-enabled - Get enabled state
 * - text-prediction:set-enabled - Enable/disable with model loading
 * - text-prediction:get-gpu-enabled - Get GPU acceleration state
 * - text-prediction:set-gpu-enabled - Enable/disable GPU with model reload
 * - text-prediction:get-status - Get full status
 * - text-prediction:predict - Predict text completion
 *
 * Also manages:
 * - LlmManager status change subscription
 * - Status and download progress broadcasting to all windows
 * - Startup initialization
 *
 * @module ipc/TextPredictionIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextPredictionIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for text prediction related IPC channels.
 *
 * Manages local LLM text prediction including:
 * - Model download and loading
 * - GPU acceleration settings
 * - Status broadcasting to all windows
 */
class TextPredictionIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    statusUnsubscribe = null;
    /**
     * Register text prediction IPC handlers with ipcMain.
     * Also subscribes to LlmManager status changes.
     */
    register() {
        // Get text prediction enabled state
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED, () => {
            return this._handleGetEnabled();
        });
        // Set text prediction enabled state
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED, async (_event, enabled) => {
            await this._handleSetEnabled(enabled);
        });
        // Get GPU acceleration enabled state
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TEXT_PREDICTION_GET_GPU_ENABLED, () => {
            return this._handleGetGpuEnabled();
        });
        // Set GPU acceleration enabled state
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED, async (_event, enabled) => {
            await this._handleSetGpuEnabled(enabled);
        });
        // Get full text prediction status
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS, () => {
            return this._handleGetStatus();
        });
        // Predict text
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TEXT_PREDICTION_PREDICT, async (_event, partialText) => {
            return await this._handlePredict(partialText);
        });
        // Subscribe to LlmManager status changes
        this._subscribeToStatusChanges();
    }
    /**
     * Initialize text prediction on app startup.
     * Loads the model if text prediction was previously enabled.
     * Should be called after register().
     */
    async initializeOnStartup() {
        if (!this.deps.llmManager) {
            this.logger.log('Text prediction initialization skipped - no LlmManager');
            return;
        }
        try {
            const enabled = this.deps.store.get('textPredictionEnabled') ?? false;
            const gpuEnabled = this.deps.store.get('textPredictionGpuEnabled') ?? false;
            this.logger.log('Initializing text prediction on startup', {
                enabled,
                gpuEnabled,
            });
            if (!enabled) {
                this.logger.log('Text prediction disabled, skipping model load');
                return;
            }
            if (process.env.NODE_ENV !== 'test') {
                this.deps.llmNativeAvailable = this.deps.llmManager.ensureNativeAvailable('initializeOnStartup');
            }
            if (this.deps.llmNativeAvailable === undefined) {
                this.deps.llmNativeAvailable = this.deps.llmManager.isNativeAvailable();
            }
            if (!this.deps.llmNativeAvailable) {
                this.logger.warn('Text prediction initialization skipped - native module unavailable', {
                    error: this.deps.llmManager.getNativeProbeError(),
                });
                this._broadcastStatusChange();
                return;
            }
            // Set GPU preference from stored setting
            this.deps.llmManager.setGpuEnabled(gpuEnabled);
            // Check if model is downloaded
            if (!this.deps.llmManager.isModelDownloaded()) {
                this.logger.log('Text prediction enabled but model not downloaded, skipping auto-load');
                return;
            }
            // Load the model
            this.logger.log('Auto-loading text prediction model on startup...');
            await this.deps.llmManager.loadModel();
            this.logger.log('Text prediction model loaded successfully on startup');
            // Broadcast status to any open windows
            this._broadcastStatusChange();
        }
        catch (error) {
            this.logger.error('Failed to initialize text prediction on startup:', {
                error: error.message,
            });
        }
    }
    /**
     * Handle text-prediction:get-enabled request.
     * @returns Current enabled state
     */
    _handleGetEnabled() {
        try {
            const enabled = this.deps.store.get('textPredictionEnabled') ?? false;
            this.logger.log('TEXT_PREDICTION_GET_ENABLED called, returning:', enabled);
            return enabled;
        }
        catch (error) {
            this.handleError('getting text prediction enabled', error);
            return false;
        }
    }
    /**
     * Handle text-prediction:set-enabled request.
     * @param enabled - New enabled state
     */
    async _handleSetEnabled(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid textPredictionEnabled value: ${enabled}`);
                return;
            }
            if (enabled && this.deps.llmManager) {
                if (process.env.NODE_ENV !== 'test' && process.type && process.type !== 'browser') {
                    this.logger.error('Text prediction enable blocked - not in main process', {
                        processType: process.type,
                    });
                    this._broadcastStatusChange();
                    return;
                }
            }
            // Persist preference
            this.deps.store.set('textPredictionEnabled', enabled);
            this.logger.log(`Text prediction enabled set to: ${enabled}`);
            // If enabling and LlmManager exists, trigger model download/load if needed
            if (enabled && this.deps.llmManager) {
                // node-llama-cpp runs in an isolated sidecar process, so the
                // main-process V8 sandbox no longer blocks text prediction.
                const skipNativeOperations = process.env.CI === 'true' || process.argv.includes('--integration-test');
                if (skipNativeOperations) {
                    this.logger.log('Skipping native module operations for text prediction', {
                        ci: process.env.CI === 'true',
                        integrationTest: process.argv.includes('--integration-test'),
                    });
                }
                else {
                    if (process.env.NODE_ENV !== 'test') {
                        this.deps.llmNativeAvailable = this.deps.llmManager.ensureNativeAvailable('setEnabled');
                    }
                    if (this.deps.llmNativeAvailable === undefined) {
                        this.deps.llmNativeAvailable = this.deps.llmManager.isNativeAvailable();
                    }
                    if (!this.deps.llmNativeAvailable) {
                        this.logger.warn('Text prediction enable requested but native module unavailable', {
                            error: this.deps.llmManager.getNativeProbeError(),
                        });
                        this._broadcastStatusChange();
                        return;
                    }
                    if (!this.deps.llmManager.isModelDownloaded()) {
                        this.logger.log('Model not downloaded, starting download...');
                        // Trigger download with progress events
                        await this.deps.llmManager.downloadModel((progress) => {
                            this._broadcastDownloadProgress(progress);
                        });
                        this.logger.log('Model download completed');
                    }
                    else {
                        this.logger.log('Model already downloaded, skipping download');
                    }
                    // Load model if not already loaded
                    if (!this.deps.llmManager.isModelLoaded()) {
                        this.logger.log('Model not loaded, starting load...');
                        await this.deps.llmManager.loadModel();
                        this.logger.log('Model load completed');
                    }
                    else {
                        this.logger.log('Model already loaded');
                    }
                }
            }
            else if (!enabled && this.deps.llmManager) {
                // Unload model when disabling
                this.logger.log('Disabling text prediction, unloading model');
                this.deps.llmManager.unloadModel();
            }
            // Broadcast status change
            this._broadcastStatusChange();
        }
        catch (error) {
            this.handleError('setting text prediction enabled', error, { enabled });
            // Broadcast the error state
            this._broadcastStatusChange();
        }
    }
    /**
     * Handle text-prediction:get-gpu-enabled request.
     * @returns Current GPU enabled state
     */
    _handleGetGpuEnabled() {
        try {
            return this.deps.store.get('textPredictionGpuEnabled') ?? false;
        }
        catch (error) {
            this.handleError('getting text prediction GPU enabled', error);
            return false;
        }
    }
    /**
     * Handle text-prediction:set-gpu-enabled request.
     * @param enabled - New GPU enabled state
     */
    async _handleSetGpuEnabled(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid textPredictionGpuEnabled value: ${enabled}`);
                return;
            }
            // Persist preference
            this.deps.store.set('textPredictionGpuEnabled', enabled);
            this.logger.log(`Text prediction GPU enabled set to: ${enabled}`);
            // Update LlmManager GPU setting and reload model if loaded
            if (this.deps.llmManager) {
                const wasLoaded = this.deps.llmManager.isModelLoaded();
                const previousGpuState = this.deps.llmManager.isGpuEnabled();
                this.logger.log('GPU setting change requested', {
                    previousGpuEnabled: previousGpuState,
                    newGpuEnabled: enabled,
                    modelWasLoaded: wasLoaded,
                });
                this.deps.llmManager.setGpuEnabled(enabled);
                // Reload model to apply GPU setting change
                if (wasLoaded) {
                    this.logger.log('Model reload required - unloading current model...');
                    this.deps.llmManager.unloadModel();
                    this.logger.log('Model unloaded - loading with new GPU setting...');
                    await this.deps.llmManager.loadModel();
                    const newStatus = this.deps.llmManager.getStatus();
                    this.logger.log('Model reload complete', {
                        gpuEnabled: this.deps.llmManager.isGpuEnabled(),
                        newStatus,
                    });
                    this._broadcastStatusChange();
                }
                else {
                    this.logger.log('Model not loaded, GPU setting will apply on next load');
                }
            }
        }
        catch (error) {
            this.handleError('setting text prediction GPU enabled', error, { enabled });
        }
    }
    /**
     * Handle text-prediction:get-status request.
     * @returns Full text prediction status
     */
    _handleGetStatus() {
        const status = this._getStatus();
        this.logger.log('TEXT_PREDICTION_GET_STATUS called, returning:', status);
        return status;
    }
    /**
     * Handle text-prediction:predict request.
     * @param partialText - Partial text to complete
     * @returns Predicted completion or null
     */
    async _handlePredict(partialText) {
        try {
            if (typeof partialText !== 'string') {
                this.logger.warn(`Invalid partialText value: ${typeof partialText}`);
                return null;
            }
            if (!this.deps.llmManager) {
                this.logger.warn('LlmManager not available for prediction');
                return null;
            }
            this.logger.log('TEXT_PREDICTION_PREDICT called, input length:', partialText.length);
            const result = await this.deps.llmManager.predict(partialText);
            this.logger.log('TEXT_PREDICTION_PREDICT result:', result ? `${result.length} chars` : 'null');
            return result;
        }
        catch (error) {
            this.handleError('predicting text', error, { partialTextLength: partialText?.length });
            return null;
        }
    }
    /**
     * Subscribe to LlmManager status changes.
     */
    _subscribeToStatusChanges() {
        if (this.deps.llmManager) {
            this.statusUnsubscribe = this.deps.llmManager.onStatusChange(() => {
                const status = this.deps.llmManager?.getStatus() ?? 'not-downloaded';
                this.deps.store.set('textPredictionModelStatus', status);
                this._broadcastStatusChange();
            });
        }
    }
    /**
     * Get the current text prediction status.
     */
    _getStatus() {
        const enabled = this.deps.store.get('textPredictionEnabled') ?? false;
        const nativeAvailable = enabled
            ? (this.deps.llmNativeAvailable ?? this.deps.llmManager?.isNativeAvailable() ?? false)
            : true;
        const modelStatus = this.deps.llmManager?.getStatus();
        const storedStatus = this.deps.store.get('textPredictionModelStatus');
        // node-llama-cpp runs in an isolated sidecar process, so the
        // main-process V8 sandbox no longer requires a restart.
        const status = nativeAvailable ? (modelStatus ?? storedStatus ?? 'not-downloaded') : 'error';
        const errorMessage = this.deps.llmManager?.getErrorMessage() ??
            (!nativeAvailable ? (this.deps.llmManager?.getNativeProbeError() ?? undefined) : undefined);
        const settings = {
            enabled,
            gpuEnabled: this.deps.store.get('textPredictionGpuEnabled') ?? false,
            status,
            downloadProgress: this.deps.llmManager?.getDownloadProgress(),
        };
        if (typeof errorMessage === 'string' && errorMessage.length > 0) {
            return {
                ...settings,
                errorMessage,
            };
        }
        return settings;
    }
    /**
     * Broadcast text prediction status change to all open windows.
     */
    _broadcastStatusChange() {
        const status = this._getStatus();
        const windows = electron_1.BrowserWindow.getAllWindows();
        this.logger.log('Broadcasting text prediction status change:', status, `to ${windows.length} windows`);
        windows.forEach((win) => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(constants_1.IPC_CHANNELS.TEXT_PREDICTION_STATUS_CHANGED, status);
                }
            }
            catch (error) {
                this.logger.error('Error broadcasting text prediction status change to window:', {
                    error: error.message,
                    windowId: win.id,
                });
            }
        });
    }
    /**
     * Broadcast text prediction download progress to all open windows.
     * @param progress - Download progress percentage (0-100)
     */
    _broadcastDownloadProgress(progress) {
        const windows = electron_1.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(constants_1.IPC_CHANNELS.TEXT_PREDICTION_DOWNLOAD_PROGRESS, progress);
                }
            }
            catch (error) {
                this.logger.error('Error broadcasting text prediction download progress to window:', {
                    error: error.message,
                    windowId: win.id,
                });
            }
        });
    }
    /** Unregister all IPC handlers. */
    unregister() {
        if (this.statusUnsubscribe) {
            this.statusUnsubscribe();
            this.statusUnsubscribe = null;
        }
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TEXT_PREDICTION_GET_GPU_ENABLED);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TEXT_PREDICTION_PREDICT);
    }
}
exports.TextPredictionIpcHandler = TextPredictionIpcHandler;
