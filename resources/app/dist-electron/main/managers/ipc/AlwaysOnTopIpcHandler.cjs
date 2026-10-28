"use strict";
/**
 * Always On Top IPC Handler.
 *
 * Handles IPC channels for always-on-top management:
 * - always-on-top:get - Returns current always-on-top state from store
 * - always-on-top:set - Sets the always-on-top state
 *
 * Also subscribes to windowManager always-on-top-changed events for
 * persistence and broadcasting to all windows.
 *
 * @module ipc/AlwaysOnTopIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlwaysOnTopIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for always-on-top-related IPC channels.
 *
 * Manages always-on-top persistence, windowManager delegation, and broadcasting
 * state changes to all windows.
 */
class AlwaysOnTopIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /** Bound listener for windowManager always-on-top-changed events (stored for cleanup). */
    _boundAlwaysOnTopChanged = null;
    /**
     * Register always-on-top IPC handlers with ipcMain.
     */
    register() {
        // Get current always-on-top state
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.ALWAYS_ON_TOP_GET, () => {
            return this._handleGetAlwaysOnTop();
        });
        // Set always-on-top state
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.ALWAYS_ON_TOP_SET, (_event, enabled) => {
            this._handleSetAlwaysOnTop(enabled);
        });
        // Subscribe to windowManager always-on-top changes
        this._boundAlwaysOnTopChanged = (enabled) => {
            this._handleAlwaysOnTopChanged(enabled);
        };
        this.deps.windowManager.on('always-on-top-changed', this._boundAlwaysOnTopChanged);
    }
    /**
     * Initialize always-on-top state from stored preference.
     * Called during handler initialization.
     */
    initialize() {
        try {
            const savedEnabled = this.deps.store.get('alwaysOnTop') ?? false;
            if (savedEnabled) {
                this.deps.windowManager.setAlwaysOnTop(savedEnabled);
            }
            this.logger.log(`Always on top initialized to: ${savedEnabled}`);
        }
        catch (error) {
            this.handleError('initializing always on top', error);
        }
    }
    /**
     * Handle always-on-top:get request.
     * @returns Current always-on-top state
     */
    _handleGetAlwaysOnTop() {
        try {
            const enabled = this.deps.store.get('alwaysOnTop') ?? false;
            return { enabled };
        }
        catch (error) {
            this.logger.error('Error getting always on top state:', error);
            return { enabled: false };
        }
    }
    /**
     * Handle always-on-top:set request.
     * @param enabled - The always-on-top state to set
     */
    _handleSetAlwaysOnTop(enabled) {
        try {
            // Validate enabled value
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid alwaysOnTop value: ${enabled}`);
                return;
            }
            // Update WindowManager - this will emit 'always-on-top-changed'
            // which this handler listens to for persistence and broadcasting
            this.deps.windowManager.setAlwaysOnTop(enabled);
            this.logger.log(`Always on top requested: ${enabled}`);
        }
        catch (error) {
            this.logger.error('Error setting always on top:', {
                error: error.message,
                requestedEnabled: enabled,
            });
        }
    }
    /**
     * Handle always-on-top state changes from WindowManager.
     * Persists the state and broadcasts to all windows.
     * @param enabled - New always-on-top state
     */
    _handleAlwaysOnTopChanged(enabled) {
        try {
            // Persist preference
            this.deps.store.set('alwaysOnTop', enabled);
            this.logger.log(`Always on top changed to: ${enabled} (persisted and broadcasting)`);
            // Broadcast to all windows
            this.broadcastToAllWindows(constants_1.IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, { enabled });
        }
        catch (error) {
            this.logger.error('Error handling always on top change:', {
                error: error.message,
                enabled,
            });
        }
    }
    /** Unregister all IPC handlers. */
    unregister() {
        if (this._boundAlwaysOnTopChanged) {
            this.deps.windowManager.removeListener('always-on-top-changed', this._boundAlwaysOnTopChanged);
            this._boundAlwaysOnTopChanged = null;
        }
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.ALWAYS_ON_TOP_GET);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.ALWAYS_ON_TOP_SET);
    }
}
exports.AlwaysOnTopIpcHandler = AlwaysOnTopIpcHandler;
