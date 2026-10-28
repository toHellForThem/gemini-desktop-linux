"use strict";
/**
 * Response Notification IPC Handler.
 *
 * Handles IPC channels for response notification settings:
 * - response-notifications:get-enabled - Returns whether notifications are enabled
 * - response-notifications:set-enabled - Sets the notification enabled state
 *
 * @module ipc/ResponseNotificationIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseNotificationIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for response notification IPC channels.
 *
 * Manages notification settings persistence and NotificationManager synchronization.
 */
class ResponseNotificationIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /** NotificationManager for managing notification state (can be set after construction) */
    notificationManager;
    /**
     * Creates a new ResponseNotificationIpcHandler instance.
     * @param deps - Handler dependencies including notificationManager
     */
    constructor(deps) {
        super(deps);
        this.notificationManager = deps.notificationManager ?? null;
    }
    /**
     * Set the NotificationManager instance.
     * This is used for late injection when NotificationManager is created after IpcManager.
     * @param manager - The NotificationManager instance to use
     */
    setNotificationManager(manager) {
        this.notificationManager = manager;
        this.logger.log(`NotificationManager ${manager ? 'set' : 'cleared'}`);
    }
    /**
     * Register response notification IPC handlers with ipcMain.
     */
    register() {
        // Get whether response notifications are enabled
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED, () => {
            return this._handleGetEnabled();
        });
        // Set response notification enabled state
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED, (_event, enabled) => {
            this._handleSetEnabled(enabled);
        });
        // Dev Testing: Trigger response notification (for manual testing with main window unfocused)
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION, () => {
            this._handleDevTriggerNotification();
        });
    }
    /**
     * Handle response-notifications:get-enabled request.
     * @returns Whether response notifications are enabled
     */
    _handleGetEnabled() {
        try {
            if (!this.notificationManager) {
                this.logger.warn('NotificationManager not available');
                return true; // Default to enabled
            }
            return this.notificationManager.isEnabled();
        }
        catch (error) {
            this.logger.error('Error getting response notifications enabled:', error);
            return true; // Default to enabled
        }
    }
    /**
     * Handle response-notifications:set-enabled request.
     * @param enabled - Whether to enable response notifications
     */
    _handleSetEnabled(enabled) {
        try {
            // Validate input type
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }
            if (!this.notificationManager) {
                this.logger.warn('NotificationManager not available');
                return;
            }
            // Update NotificationManager (which also persists to store)
            this.notificationManager.setEnabled(enabled);
            this.logger.log(`Response notifications ${enabled ? 'enabled' : 'disabled'}`);
        }
        catch (error) {
            this.logger.error('Error setting response notifications enabled:', {
                error: error.message,
                requestedEnabled: enabled,
            });
        }
    }
    /**
     * Handle dev:test:trigger-response-notification request.
     * Manually trigger a response notification for development testing.
     * Call this from Options window DevTools to test notification with main window unfocused.
     */
    _handleDevTriggerNotification() {
        try {
            if (!this.notificationManager) {
                this.logger.warn('NotificationManager not available for dev trigger');
                return;
            }
            this.logger.log('DEV: Manually triggering response notification');
            this.notificationManager.onResponseComplete();
        }
        catch (error) {
            this.logger.error('Error triggering dev response notification:', error);
        }
    }
    /** Unregister all IPC handlers. */
    unregister() {
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION);
    }
}
exports.ResponseNotificationIpcHandler = ResponseNotificationIpcHandler;
