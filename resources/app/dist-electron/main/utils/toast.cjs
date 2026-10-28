"use strict";
/**
 * Toast Utility for Main Process
 *
 * Provides a helper function for sending toast notifications from the main process
 * to renderer windows via IPC.
 *
 * @module main/utils/toast
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.showToast = showToast;
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
/**
 * Send a toast notification to a renderer window.
 *
 * @param window - The BrowserWindow to send the toast to
 * @param options - Toast payload with type, message, and optional title/duration/progress
 *
 * @example
 * ```ts
 * import { showToast } from './utils/toast';
 *
 * // Show a success toast
 * showToast(mainWindow, {
 *   type: 'success',
 *   message: 'File saved successfully!',
 * });
 *
 * // Show an error toast with title
 * showToast(mainWindow, {
 *   type: 'error',
 *   title: 'Connection Failed',
 *   message: 'Unable to connect to server. Please try again.',
 * });
 *
 * // Show a progress toast
 * showToast(mainWindow, {
 *   type: 'progress',
 *   title: 'Downloading...',
 *   message: 'update-1.2.3.exe',
 *   progress: 45,
 * });
 * ```
 */
function showToast(window, options) {
    if (window && !window.isDestroyed()) {
        window.webContents.send(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW, options);
    }
}
