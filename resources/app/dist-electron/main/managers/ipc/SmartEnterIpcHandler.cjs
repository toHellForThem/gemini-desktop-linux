"use strict";
/**
 * Smart Enter and Chat Scroll IPC Handler.
 *
 * Handles IPC channels for smart enter and scroll-to-bottom button preferences:
 * - smart-enter:get-enabled - Returns whether Smart Enter is enabled
 * - smart-enter:set-enabled - Sets the Smart Enter enabled state
 * - scroll-to-bottom:get-enabled - Returns whether Scroll-to-Bottom button is enabled
 * - scroll-to-bottom:set-enabled - Sets the Scroll-to-Bottom button enabled state
 *
 * @module ipc/SmartEnterIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartEnterIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
class SmartEnterIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /**
     * Register Smart Enter and Scroll-to-Bottom IPC handlers with ipcMain.
     */
    register() {
        // Smart Enter
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SMART_ENTER_GET_ENABLED, () => {
            return this._handleGetSmartEnterEnabled();
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.SMART_ENTER_SET_ENABLED, (_event, enabled) => {
            this._handleSetSmartEnterEnabled(enabled);
        });
        // Scroll to Bottom
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED, () => {
            return this._handleGetScrollToBottomEnabled();
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED, (_event, enabled) => {
            this._handleSetScrollToBottomEnabled(enabled);
        });
    }
    /**
     * Handle smart-enter:get-enabled request.
     * @returns Whether Smart Enter is enabled
     */
    _handleGetSmartEnterEnabled() {
        try {
            return this.deps.store.get('smartEnterEnabled') !== false;
        }
        catch (error) {
            this.logger.error('Error getting smartEnterEnabled:', error);
            return true; // Default to enabled
        }
    }
    /**
     * Handle smart-enter:set-enabled request.
     * @param enabled - Whether to enable Smart Enter
     */
    _handleSetSmartEnterEnabled(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid smartEnterEnabled value: ${enabled}`);
                return;
            }
            this.deps.store.set('smartEnterEnabled', enabled);
            this.logger.log(`Smart Enter set to: ${enabled}`);
        }
        catch (error) {
            this.logger.error('Error setting smartEnterEnabled:', error);
        }
    }
    /**
     * Handle scroll-to-bottom:get-enabled request.
     * @returns Whether Scroll-to-Bottom button is enabled
     */
    _handleGetScrollToBottomEnabled() {
        try {
            return this.deps.store.get('scrollToBottomButtonEnabled') !== false;
        }
        catch (error) {
            this.logger.error('Error getting scrollToBottomButtonEnabled:', error);
            return true; // Default to enabled
        }
    }
    /**
     * Handle scroll-to-bottom:set-enabled request.
     * @param enabled - Whether to enable Scroll-to-Bottom button
     */
    _handleSetScrollToBottomEnabled(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid scrollToBottomButtonEnabled value: ${enabled}`);
                return;
            }
            this.deps.store.set('scrollToBottomButtonEnabled', enabled);
            this.logger.log(`Scroll-to-Bottom button set to: ${enabled}`);
        }
        catch (error) {
            this.logger.error('Error setting scrollToBottomButtonEnabled:', error);
        }
    }
    /**
     * Unregister all IPC handlers.
     */
    unregister() {
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.SMART_ENTER_GET_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.SMART_ENTER_SET_ENABLED);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED);
    }
}
exports.SmartEnterIpcHandler = SmartEnterIpcHandler;
