"use strict";
/**
 * Zoom IPC Handler.
 *
 * Handles IPC channels for zoom level management:
 * - zoom:get-level - Returns current zoom level from windowManager
 * - zoom:zoom-in - Increases zoom level
 * - zoom:zoom-out - Decreases zoom level
 *
 * Also subscribes to windowManager zoom-level-changed events for
 * persistence and broadcasting to all windows.
 *
 * @module ipc/ZoomIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZoomIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for zoom-related IPC channels.
 *
 * Manages zoom level persistence, windowManager delegation, and broadcasting
 * zoom level changes to all windows.
 */
class ZoomIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /** Bound listener for windowManager zoom-level-changed events (stored for cleanup). */
    _boundZoomLevelChanged = null;
    /**
     * Register zoom IPC handlers with ipcMain.
     */
    register() {
        // Get current zoom level
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.ZOOM_GET_LEVEL, () => {
            return this._handleGetZoomLevel();
        });
        // Zoom in
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.ZOOM_IN, () => {
            return this._handleZoomIn();
        });
        // Zoom out
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.ZOOM_OUT, () => {
            return this._handleZoomOut();
        });
        // Subscribe to windowManager zoom level changes
        this._boundZoomLevelChanged = (level) => {
            this._handleZoomLevelChanged(level);
        };
        this.deps.windowManager.on('zoom-level-changed', this._boundZoomLevelChanged);
    }
    /**
     * Initialize zoom level from stored preference.
     * Called during handler initialization.
     */
    initialize() {
        try {
            const savedZoomLevel = this.deps.store.get('zoomLevel');
            this.deps.windowManager.initializeZoomLevel(savedZoomLevel);
            // Apply zoom after a short delay to ensure window is fully ready
            setTimeout(() => {
                this.deps.windowManager.applyZoomLevel();
            }, 100);
            this.logger.log('Zoom level initialized');
        }
        catch (error) {
            this.handleError('initializing zoom level', error);
        }
    }
    /**
     * Handle zoom:get-level request.
     * @returns Current zoom level percentage
     */
    _handleGetZoomLevel() {
        try {
            return this.deps.windowManager.getZoomLevel();
        }
        catch (error) {
            this.logger.error('Error getting zoom level:', error);
            return 100; // Default
        }
    }
    /**
     * Handle zoom:zoom-in request.
     * @returns New zoom level after zooming in
     */
    _handleZoomIn() {
        try {
            this.deps.windowManager.zoomIn();
            return this.deps.windowManager.getZoomLevel();
        }
        catch (error) {
            this.logger.error('Error zooming in:', error);
            return this.deps.windowManager.getZoomLevel();
        }
    }
    /**
     * Handle zoom:zoom-out request.
     * @returns New zoom level after zooming out
     */
    _handleZoomOut() {
        try {
            this.deps.windowManager.zoomOut();
            return this.deps.windowManager.getZoomLevel();
        }
        catch (error) {
            this.logger.error('Error zooming out:', error);
            return this.deps.windowManager.getZoomLevel();
        }
    }
    /**
     * Handle zoom level changes from WindowManager.
     * Persists the zoom level to store and broadcasts to all windows.
     * @param level - New zoom level percentage
     */
    _handleZoomLevelChanged(level) {
        try {
            // Persist preference
            this.deps.store.set('zoomLevel', level);
            // Broadcast to all windows
            this.broadcastToAllWindows(constants_1.IPC_CHANNELS.ZOOM_LEVEL_CHANGED, level);
            this.logger.log(`Zoom level changed to: ${level}% (persisted and broadcast)`);
        }
        catch (error) {
            this.logger.error('Error handling zoom level change:', {
                error: error.message,
                level,
            });
        }
    }
    /** Unregister all IPC handlers. */
    unregister() {
        if (this._boundZoomLevelChanged) {
            this.deps.windowManager.removeListener('zoom-level-changed', this._boundZoomLevelChanged);
            this._boundZoomLevelChanged = null;
        }
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.ZOOM_GET_LEVEL);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.ZOOM_IN);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.ZOOM_OUT);
    }
}
exports.ZoomIpcHandler = ZoomIpcHandler;
