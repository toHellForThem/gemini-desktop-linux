"use strict";
/**
 * App IPC Handler.
 *
 * Handles application-level IPC channels for opening options windows
 * and Google sign-in authentication.
 *
 * @module ipc/AppIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for application-level IPC operations.
 *
 * Currently handles:
 * - `open-options` - Opens the options window, optionally to a specific tab
 * - `open-google-signin` - Opens Google sign-in authentication window
 */
class AppIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /**
     * Register app IPC handlers with ipcMain.
     */
    register() {
        // Open options window (optionally to a specific tab)
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.OPEN_OPTIONS, (_event, tab) => {
            try {
                this.deps.windowManager.createOptionsWindow(tab);
            }
            catch (error) {
                this.logger.error('Error opening options window:', error);
            }
        });
        // Open Google sign-in using WindowManager's createAuthWindow
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.OPEN_GOOGLE_SIGNIN, async () => {
            try {
                const authWindow = this.deps.windowManager.createAuthWindow(constants_1.GOOGLE_ACCOUNTS_URL);
                // Return a promise that resolves when window is closed
                return new Promise((resolve) => {
                    authWindow.on('closed', () => resolve());
                });
            }
            catch (error) {
                this.logger.error('Error opening Google sign-in:', error);
                throw error;
            }
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.APP_RESTART, async () => {
            try {
                electron_1.app.relaunch({ args: process.argv.slice(1) });
                electron_1.app.exit(0);
            }
            catch (error) {
                this.logger.error('Error restarting app:', error);
                throw error;
            }
        });
        // Quit application
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.APP_QUIT, () => {
            try {
                electron_1.app.quit();
            }
            catch (error) {
                this.logger.error('Error quitting app:', error);
            }
        });
    }
    /** Unregister all IPC handlers. */
    unregister() {
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.OPEN_OPTIONS);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.OPEN_GOOGLE_SIGNIN);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.APP_RESTART);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.APP_QUIT);
    }
}
exports.AppIpcHandler = AppIpcHandler;
