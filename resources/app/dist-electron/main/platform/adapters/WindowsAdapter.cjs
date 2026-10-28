"use strict";
/**
 * WindowsAdapter — Windows platform adapter.
 *
 * Encapsulates Windows-specific app configuration, AppUserModelId setup,
 * native hotkey registration strategy, badge overlay, tray behavior,
 * and menu configuration.
 *
 * @module WindowsAdapter
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsAdapter = void 0;
const constants_1 = require("../../utils/constants.cjs");
/** Default WaylandStatus for non-Linux platforms */
const DEFAULT_WAYLAND_STATUS = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};
class WindowsAdapter {
    id = 'windows';
    /**
     * Apply Windows-specific app configuration at startup.
     * Sets the display name shown in the taskbar and window titles.
     */
    applyAppConfiguration(app, _logger) {
        app.setName('Gemini Desktop');
    }
    /**
     * Set Windows Application User Model ID for notification branding
     * and taskbar grouping.
     */
    applyAppUserModelId(app) {
        app.setAppUserModelId(constants_1.APP_ID);
    }
    /**
     * Windows uses Electron's native globalShortcut API.
     */
    getHotkeyRegistrationPlan() {
        return {
            mode: 'native',
            waylandStatus: DEFAULT_WAYLAND_STATUS,
        };
    }
    /**
     * Windows is not Wayland — return default (all-false) status.
     */
    getWaylandStatus() {
        return DEFAULT_WAYLAND_STATUS;
    }
    shouldQuitOnWindowAllClosed() {
        return true;
    }
    getTitleBarStyle() {
        return undefined;
    }
    getAppIconFilename() {
        return 'icon.ico';
    }
    getTrayIconFilename() {
        return 'icon.ico';
    }
    shouldDisableUpdates(env) {
        return !!env.PORTABLE_EXECUTABLE_DIR;
    }
    supportsAutoUpdate(env = process.env) {
        return !env.PORTABLE_EXECUTABLE_DIR;
    }
    async requestMediaPermissions(_logger) {
        return;
    }
    getNotificationSupportHint() {
        return undefined;
    }
    // ----- Badge methods -----
    supportsBadges() {
        return true;
    }
    showBadge(params) {
        if (params.window && !params.window.isDestroyed() && params.overlayIcon) {
            params.window.setOverlayIcon(params.overlayIcon, params.description);
        }
    }
    clearBadge(params) {
        if (params.window && !params.window.isDestroyed()) {
            params.window.setOverlayIcon(null, '');
        }
    }
    // ----- Window methods -----
    getMainWindowPlatformConfig() {
        return {};
    }
    hideToTray(window) {
        window.hide();
        window.setSkipTaskbar(true);
    }
    restoreFromTray(window) {
        window.show();
        window.focus();
        window.setSkipTaskbar(false);
    }
    // ----- Menu methods -----
    shouldIncludeAppMenu() {
        return false;
    }
    getSettingsMenuLabel() {
        return 'Options';
    }
    getWindowCloseRole() {
        return 'quit';
    }
    getDockMenuTemplate(_callbacks) {
        return null;
    }
}
exports.WindowsAdapter = WindowsAdapter;
