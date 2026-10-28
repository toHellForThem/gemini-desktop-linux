"use strict";
/**
 * Abstract base class for IPC handlers.
 *
 * Provides common utilities and patterns for domain-specific IPC handlers.
 * All handlers should extend this class to ensure consistent behavior and
 * reduce code duplication.
 *
 * @module ipc/BaseIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseIpcHandler = void 0;
const electron_1 = require("electron");
/**
 * Abstract base class for IPC handlers.
 *
 * Provides:
 * - Dependency injection via constructor
 * - `getWindowFromEvent()` helper for safely extracting window from IPC events
 * - `broadcastToAllWindows()` helper for sending messages to all windows
 * - `handleError()` helper for consistent error logging
 */
class BaseIpcHandler {
    /** Dependencies injected via constructor */
    deps;
    /** Logger instance for consistent logging */
    logger;
    /**
     * Creates a new IPC handler instance.
     * @param deps - Handler dependencies
     */
    constructor(deps) {
        this.deps = deps;
        this.logger = deps.logger;
    }
    /**
     * Get the BrowserWindow from an IPC event safely.
     *
     * Extracts the window that sent the IPC message, handling cases where
     * the window may have been destroyed or the webContents is invalid.
     *
     * @param event - IPC event from ipcMain.on or ipcMain.handle
     * @returns The BrowserWindow or null if not found/destroyed
     */
    getWindowFromEvent(event) {
        try {
            const win = electron_1.BrowserWindow.fromWebContents(event.sender);
            if (win && win.isDestroyed()) {
                return null;
            }
            return win;
        }
        catch (error) {
            this.logger.error('Failed to get window from event:', error);
            return null;
        }
    }
    /**
     * Broadcast a message to all open windows.
     *
     * Sends an IPC message to all BrowserWindow instances, gracefully
     * handling destroyed windows. Errors for individual windows are logged
     * but don't affect other windows.
     *
     * @param channel - IPC channel to send on
     * @param data - Optional data to send
     */
    broadcastToAllWindows(channel, data) {
        const windows = electron_1.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(channel, data);
                }
            }
            catch (error) {
                this.logger.error('Error broadcasting to window:', {
                    error: error.message,
                    windowId: win.id,
                    channel,
                });
            }
        });
    }
    /**
     * Log an error with consistent formatting and context.
     *
     * Provides a standardized way to log errors with operation name and
     * optional context data. Use this for all error handling in handlers.
     *
     * @param operation - Description of the operation that failed
     * @param error - The error that occurred
     * @param context - Optional additional context data
     */
    handleError(operation, error, context) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Error during ${operation}:`, {
            error: errorMessage,
            stack: errorStack,
            ...context,
        });
    }
}
exports.BaseIpcHandler = BaseIpcHandler;
