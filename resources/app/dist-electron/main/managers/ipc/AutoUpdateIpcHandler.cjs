"use strict";
/**
 * Auto-Update IPC Handler.
 *
 * Handles IPC channels for auto-update operations:
 * - auto-update:get-enabled - Get enabled state
 * - auto-update:set-enabled - Set enabled state with validation
 * - auto-update:check - Trigger manual update check
 * - auto-update:get-last-check - Get last check timestamp
 * - auto-update:install - Install downloaded update
 * - dev:test:* channels - Development testing utilities
 * - tray:get-tooltip - Get tray tooltip text
 *
 * @module ipc/AutoUpdateIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoUpdateIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/**
 * Handler for auto-update related IPC channels.
 *
 * Manages auto-update settings, triggers update actions,
 * and provides dev testing utilities.
 */
class AutoUpdateIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    static hasGetLastCheckTime(value) {
        if (typeof value !== 'object' || value === null || !('getLastCheckTime' in value)) {
            return false;
        }
        const candidate = value;
        return typeof candidate.getLastCheckTime === 'function';
    }
    static hasGetTrayTooltip(value) {
        if (typeof value !== 'object' || value === null || !('getTrayTooltip' in value)) {
            return false;
        }
        const candidate = value;
        return typeof candidate.getTrayTooltip === 'function';
    }
    /**
     * Register auto-update IPC handlers with ipcMain.
     */
    register() {
        // Get auto-update enabled state
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED, () => {
            return this._handleGetEnabled();
        });
        // Set auto-update enabled state
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, (_event, enabled) => {
            this._handleSetEnabled(enabled);
        });
        // Trigger manual update check
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.AUTO_UPDATE_CHECK, () => {
            this._handleCheck();
        });
        // Get last update check time
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK, () => {
            return this._handleGetLastCheck();
        });
        // Install downloaded update
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.AUTO_UPDATE_INSTALL, () => {
            this._handleInstall();
        });
        // Dev Testing: Show badge
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.DEV_TEST_SHOW_BADGE, (_event, version) => {
            this._handleDevShowBadge(version);
        });
        // Dev Testing: Clear badge
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.DEV_TEST_CLEAR_BADGE, () => {
            this._handleDevClearBadge();
        });
        // Dev Testing: Set Update Enabled
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, (_event, enabled) => {
            this._handleDevSetUpdateEnabled(enabled);
        });
        // Dev Testing: Emit Update Event
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, (_event, eventName, data) => {
            setImmediate(() => {
                this._handleDevEmitUpdateEvent(eventName, data);
            });
        });
        // Dev Testing: Mock Platform/Env
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM, (_event, platform, env) => {
            this._handleDevMockPlatform(platform, env);
        });
        // Get tray tooltip
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TRAY_GET_TOOLTIP, () => {
            return this._handleGetTrayTooltip();
        });
    }
    /**
     * Handle auto-update:get-enabled request.
     * @returns Current enabled state
     */
    _handleGetEnabled() {
        try {
            if (this.deps.updateManager) {
                return this.deps.updateManager.isEnabled();
            }
            return this.deps.store.get('autoUpdateEnabled') ?? true;
        }
        catch (error) {
            this.handleError('getting auto-update state', error);
            return true;
        }
    }
    /**
     * Handle auto-update:set-enabled request.
     * @param enabled - New enabled state
     */
    _handleSetEnabled(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid autoUpdateEnabled value: ${enabled}`);
                return;
            }
            // Always persist to store for consistency
            this.deps.store.set('autoUpdateEnabled', enabled);
            // Also update UpdateManager if available
            if (this.deps.updateManager) {
                this.deps.updateManager.setEnabled(enabled);
            }
            this.logger.log(`Auto-update set to: ${enabled}`);
        }
        catch (error) {
            this.handleError('setting auto-update state', error, { enabled });
        }
    }
    /**
     * Handle auto-update:check request.
     */
    _handleCheck() {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.checkForUpdates(true); // manual=true
            }
        }
        catch (error) {
            this.handleError('checking for updates', error);
        }
    }
    /**
     * Handle auto-update:get-last-check request.
     * @returns Last check timestamp or 0
     */
    _handleGetLastCheck() {
        if (this.deps.updateManager) {
            if (AutoUpdateIpcHandler.hasGetLastCheckTime(this.deps.updateManager)) {
                return this.deps.updateManager.getLastCheckTime();
            }
            return 0;
        }
        return 0;
    }
    /**
     * Handle auto-update:install request.
     */
    _handleInstall() {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.quitAndInstall();
            }
        }
        catch (error) {
            this.handleError('installing update', error);
        }
    }
    /**
     * Handle dev:test:show-badge request.
     * @param version - Optional version to display
     */
    _handleDevShowBadge(version) {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.devShowBadge(version);
            }
        }
        catch (error) {
            this.handleError('showing dev test badge', error);
        }
    }
    /**
     * Handle dev:test:clear-badge request.
     */
    _handleDevClearBadge() {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.devClearBadge();
            }
        }
        catch (error) {
            this.handleError('clearing dev test badge', error);
        }
    }
    /**
     * Handle dev:test:set-update-enabled request.
     * @param enabled - New enabled state
     */
    _handleDevSetUpdateEnabled(enabled) {
        if (this.deps.updateManager) {
            this.deps.updateManager.setEnabled(enabled);
        }
    }
    /**
     * Handle dev:test:emit-update-event request.
     * @param eventName - Event name to emit
     * @param data - Event data
     */
    _handleDevEmitUpdateEvent(eventName, data) {
        if (this.deps.updateManager) {
            this.deps.updateManager.devEmitUpdateEvent(eventName, data);
        }
    }
    /**
     * Handle dev:test:mock-platform request.
     * @param platform - Platform to mock (or null to reset)
     * @param env - Environment variables to mock (or null to reset)
     */
    _handleDevMockPlatform(platform, env) {
        if (this.deps.updateManager) {
            if (platform !== undefined)
                this.deps.updateManager.devMockPlatform(platform);
            if (env !== undefined)
                this.deps.updateManager.devMockEnv(env);
        }
    }
    /**
     * Handle tray:get-tooltip request.
     * @returns Tray tooltip text
     */
    _handleGetTrayTooltip() {
        try {
            if (this.deps.updateManager) {
                if (AutoUpdateIpcHandler.hasGetTrayTooltip(this.deps.updateManager)) {
                    return this.deps.updateManager.getTrayTooltip();
                }
                return '';
            }
            return '';
        }
        catch (error) {
            this.handleError('getting tray tooltip', error);
            return '';
        }
    }
    /** Unregister all IPC handlers. */
    unregister() {
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.AUTO_UPDATE_CHECK);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.AUTO_UPDATE_INSTALL);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.DEV_TEST_SHOW_BADGE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.DEV_TEST_CLEAR_BADGE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TRAY_GET_TOOLTIP);
    }
}
exports.AutoUpdateIpcHandler = AutoUpdateIpcHandler;
