"use strict";
/**
 * Shell IPC Handler.
 *
 * Handles shell-related IPC channels for filesystem operations like
 * revealing files in the system file explorer.
 *
 * @module ipc/ShellIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for shell-related IPC operations.
 *
 * Currently handles:
 * - `shell:show-item-in-folder` - Opens file explorer and selects the file
 */
class ShellIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /**
     * Register shell IPC handlers with ipcMain.
     */
    register() {
        // Reveal file in system file explorer
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.SHELL_SHOW_ITEM_IN_FOLDER, (_event, filePath) => {
            try {
                if (typeof filePath !== 'string' || filePath.trim().length === 0) {
                    this.logger.warn('Invalid file path for reveal in folder:', filePath);
                    return;
                }
                this.logger.log('Revealing file in folder:', filePath);
                electron_1.shell.showItemInFolder(filePath);
            }
            catch (error) {
                this.logger.error('Error revealing file in folder:', {
                    error: error.message,
                    filePath,
                });
            }
        });
    }
    /** Unregister all IPC handlers. */
    unregister() {
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.SHELL_SHOW_ITEM_IN_FOLDER);
    }
}
exports.ShellIpcHandler = ShellIpcHandler;
