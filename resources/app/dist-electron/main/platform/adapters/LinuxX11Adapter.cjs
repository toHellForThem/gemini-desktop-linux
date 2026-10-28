"use strict";
/**
 * LinuxX11Adapter — Linux under X11 display server.
 *
 * Encapsulates Linux X11-specific app configuration, hotkey registration
 * strategy, badge/tray/menu behavior. X11 does not support global hotkeys
 * through Electron's globalShortcut API, so hotkeys are always disabled.
 *
 * @module LinuxX11Adapter
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxX11Adapter = void 0;
/** Default WaylandStatus for non-Wayland contexts */
const DEFAULT_WAYLAND_STATUS = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};
class LinuxX11Adapter {
    id = 'linux-x11';
    /**
     * Apply Linux-specific app configuration at startup.
     *
     * Sets app name, WM_CLASS, and desktop name for proper DE integration.
     * Does NOT log Wayland-specific messages (this is X11).
     */
    applyAppConfiguration(app, logger) {
        // Set internal app name to match the executable/id for better WM_CLASS matching
        app.setName('gemini-desktop');
        // Set X11 WM_CLASS so DEs identify the app correctly in task managers
        app.commandLine.appendSwitch('class', 'gemini-desktop');
        // Set desktop name for integration
        try {
            const desktopNameCapableApp = app;
            if (typeof desktopNameCapableApp.setDesktopName === 'function') {
                desktopNameCapableApp.setDesktopName('gemini-desktop');
            }
        }
        catch (e) {
            logger.error('Error calling setDesktopName:', e);
        }
    }
    /**
     * No-op on Linux — AppUserModelId is Windows-only.
     */
    applyAppUserModelId(_app) {
        // No-op on Linux
    }
    /**
     * X11 does not support global hotkeys through Electron — always disabled.
     */
    getHotkeyRegistrationPlan() {
        return {
            mode: 'disabled',
            waylandStatus: DEFAULT_WAYLAND_STATUS,
        };
    }
    /**
     * X11 is not Wayland — return default (all-false) status.
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
        return 'icon.png';
    }
    getTrayIconFilename() {
        return 'icon.png';
    }
    shouldDisableUpdates(env) {
        return !env.APPIMAGE;
    }
    supportsAutoUpdate(env = process.env) {
        return Boolean(env.APPIMAGE);
    }
    async requestMediaPermissions(_logger) {
        return;
    }
    getNotificationSupportHint() {
        return ('Notifications not supported on this platform. ' +
            'On Linux, ensure libnotify is installed: ' +
            'Ubuntu/Debian: apt install libnotify-bin | ' +
            'Fedora: dnf install libnotify | ' +
            'Arch: pacman -S libnotify');
    }
    // ----- Badge methods -----
    supportsBadges() {
        return false;
    }
    showBadge(_params) {
        // No native badge support on Linux
    }
    clearBadge(_params) {
        // No native badge support on Linux
    }
    // ----- Window methods -----
    getMainWindowPlatformConfig() {
        return { wmClass: 'gemini-desktop' };
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
exports.LinuxX11Adapter = LinuxX11Adapter;
