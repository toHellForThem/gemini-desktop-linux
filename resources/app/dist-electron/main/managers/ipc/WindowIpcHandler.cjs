"use strict";
/**
 * Window IPC Handler.
 *
 * Handles window control IPC channels for minimize, maximize, close,
 * show, and isMaximized operations.
 *
 * @module ipc/WindowIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for window control IPC operations.
 *
 * Handles:
 * - `window-minimize` - Minimizes the calling window
 * - `window-maximize` - Toggles maximize/unmaximize on the calling window
 * - `window-close` - Closes the calling window
 * - `window-show` - Restores the window from tray (via windowManager)
 * - `window-is-maximized` - Returns whether the calling window is maximized
 */
class WindowIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /**
     * Register window control IPC handlers with ipcMain.
     */
    register() {
        // Minimize window
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    win.minimize();
                }
                catch (error) {
                    this.logger.error('Error minimizing window:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });
        // Maximize/restore window
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    if (win.isMaximized()) {
                        win.unmaximize();
                    }
                    else {
                        win.maximize();
                    }
                }
                catch (error) {
                    this.logger.error('Error toggling maximize:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });
        // Close window
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.WINDOW_CLOSE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    win.close();
                }
                catch (error) {
                    this.logger.error('Error closing window:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });
        // Show/Restore window (e.g., from tray or helper)
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.WINDOW_SHOW, () => {
            try {
                this.deps.windowManager.restoreFromTray();
            }
            catch (error) {
                this.logger.error('Error showing window:', error);
            }
        });
        // Check if window is maximized
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
            const win = this.getWindowFromEvent(event);
            if (!win || win.isDestroyed())
                return false;
            try {
                return win.isMaximized();
            }
            catch (error) {
                this.logger.error('Error checking maximized state:', error);
                return false;
            }
        });
        // Check if window is fullscreen
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.WINDOW_IS_FULLSCREEN, (event) => {
            const win = this.getWindowFromEvent(event);
            if (!win || win.isDestroyed())
                return false;
            try {
                return win.isFullScreen();
            }
            catch (error) {
                this.logger.error('Error checking fullscreen state:', error);
                return false;
            }
        });
        // Toggle fullscreen
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.FULLSCREEN_TOGGLE, (event) => {
            const win = this.getWindowFromEvent(event);
            if (win && !win.isDestroyed()) {
                try {
                    win.setFullScreen(!win.isFullScreen());
                }
                catch (error) {
                    this.logger.error('Error toggling fullscreen:', {
                        error: error instanceof Error ? error.message : String(error),
                        windowId: win.id,
                    });
                }
            }
        });
    }
    /** Unregister all IPC handlers. */
    unregister() {
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.WINDOW_MINIMIZE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.WINDOW_MAXIMIZE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.WINDOW_CLOSE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.WINDOW_SHOW);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.WINDOW_IS_FULLSCREEN);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.FULLSCREEN_TOGGLE);
    }
}
exports.WindowIpcHandler = WindowIpcHandler;
