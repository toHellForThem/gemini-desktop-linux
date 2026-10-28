"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchAtStartupIpcHandler = void 0;
const electron_1 = require("electron");
const constants_1 = require("../../utils/constants.cjs");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
class LaunchAtStartupIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    register() {
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_GET, () => {
            return this._handleGetLaunchAtStartup();
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_SET, (_event, enabled) => {
            this._handleSetLaunchAtStartup(enabled);
        });
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.START_MINIMIZED_GET, () => {
            return this._handleGetStartMinimized();
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.START_MINIMIZED_SET, (_event, enabled) => {
            this._handleSetStartMinimized(enabled);
        });
    }
    _handleGetLaunchAtStartup() {
        try {
            const stored = this.deps.store.get('launchAtStartup');
            return stored === true;
        }
        catch (error) {
            this.handleError('getting launch at startup', error);
            return false;
        }
    }
    _handleSetLaunchAtStartup(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }
            if (!enabled) {
                this.deps.store.set('startMinimized', false);
            }
            const startMinimized = enabled && this.deps.store.get('startMinimized') === true;
            this._applyLoginItemSettings(enabled, startMinimized);
            this.deps.store.set('launchAtStartup', enabled);
            this.logger.log(`Launch at startup ${enabled ? 'enabled' : 'disabled'}`);
        }
        catch (error) {
            this.handleError('setting launch at startup', error, {
                requestedEnabled: enabled,
            });
        }
    }
    _handleGetStartMinimized() {
        try {
            const stored = this.deps.store.get('startMinimized');
            return stored === true;
        }
        catch (error) {
            this.handleError('getting start minimized', error);
            return false;
        }
    }
    _handleSetStartMinimized(enabled) {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }
            const launchAtStartup = this.deps.store.get('launchAtStartup') === true;
            const nextStartMinimized = launchAtStartup && enabled;
            this.deps.store.set('startMinimized', nextStartMinimized);
            if (launchAtStartup) {
                this._applyLoginItemSettings(true, nextStartMinimized);
            }
            this.logger.log(`Start minimized ${nextStartMinimized ? 'enabled' : 'disabled'}`);
        }
        catch (error) {
            this.handleError('setting start minimized', error, {
                requestedEnabled: enabled,
            });
        }
    }
    _applyLoginItemSettings(openAtLogin, startMinimized) {
        const args = startMinimized ? ['--hidden'] : [];
        const settings = {
            openAtLogin,
            args,
        };
        if (process.platform === 'darwin') {
            settings.openAsHidden = openAtLogin && startMinimized;
        }
        electron_1.app.setLoginItemSettings(settings);
        this.logger.log('Applied login item settings:', {
            feature: 'launch_at_startup',
            openAtLogin,
            startMinimized,
            args,
            platform: process.platform,
        });
    }
    unregister() {
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_GET);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_SET);
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.START_MINIMIZED_GET);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.START_MINIMIZED_SET);
    }
}
exports.LaunchAtStartupIpcHandler = LaunchAtStartupIpcHandler;
