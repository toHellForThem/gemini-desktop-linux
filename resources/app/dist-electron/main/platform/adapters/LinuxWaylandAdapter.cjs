"use strict";
/**
 * LinuxWaylandAdapter — Linux under Wayland compositor.
 *
 * Encapsulates Linux Wayland-specific app configuration, hotkey registration
 * strategy, badge/tray/menu behavior. Delegates Wayland detection to the
 * existing `getWaylandPlatformStatus()` in constants.ts (which wraps waylandDetector).
 *
 * @module LinuxWaylandAdapter
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxWaylandAdapter = void 0;
const constants_1 = require("../../utils/constants.cjs");
class LinuxWaylandAdapter {
    id = 'linux-wayland';
    /**
     * Apply Linux-specific app configuration at startup.
     *
     * Sets app name, WM_CLASS, desktop name for portal integration,
     * and logs Wayland detection status with portal availability.
     */
    applyAppConfiguration(app, logger) {
        // Set internal app name to match the executable/id for better WM_CLASS matching
        app.setName('gemini-desktop');
        // Set the Wayland app_id / X11 WM_CLASS so KDE and other DEs identify the app
        // correctly in portal dialogs and task managers (instead of "org.chromium.Chromium")
        app.commandLine.appendSwitch('class', 'gemini-desktop');
        // Set desktop name for portal integration
        try {
            const desktopNameCapableApp = app;
            if (typeof desktopNameCapableApp.setDesktopName === 'function') {
                desktopNameCapableApp.setDesktopName('gemini-desktop');
            }
        }
        catch (e) {
            logger.error('Error calling setDesktopName:', e);
        }
        // Wayland Global Shortcuts Detection
        const waylandStatus = (0, constants_1.getWaylandPlatformStatus)();
        logger.log('Wayland detection:', JSON.stringify(waylandStatus));
        if (waylandStatus.isWayland && waylandStatus.portalAvailable) {
            // NOTE: We intentionally do NOT enable Chromium's GlobalShortcutsPortal feature flag.
            // Chromium's globalShortcut.register() reports false positive success on KDE Plasma 6
            // and interferes with our direct D-Bus portal session. We handle global shortcuts
            // entirely via dbus-next in hotkeyManager._registerViaDBusDirect().
            logger.log(`Wayland detected on ${waylandStatus.desktopEnvironment}, attempting portal registration for global shortcuts`);
        }
        else if (waylandStatus.isWayland) {
            logger.warn(`Portal registration not available on ${waylandStatus.desktopEnvironment} — unsupported desktop environment or no session bus`);
        }
    }
    /**
     * No-op on Linux — AppUserModelId is Windows-only.
     */
    applyAppUserModelId(_app) {
        // No-op on Linux
    }
    /**
     * Determine hotkey registration strategy for Wayland.
     *
     * Returns `wayland-dbus` when the XDG Desktop Portal GlobalShortcuts
     * interface is available, `disabled` otherwise.
     */
    getHotkeyRegistrationPlan() {
        const waylandStatus = (0, constants_1.getWaylandPlatformStatus)();
        return {
            mode: waylandStatus.portalAvailable ? 'wayland-dbus' : 'disabled',
            waylandStatus,
        };
    }
    /**
     * Get the real Wayland detection status for diagnostic/UI reporting.
     */
    getWaylandStatus() {
        return (0, constants_1.getWaylandPlatformStatus)();
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
exports.LinuxWaylandAdapter = LinuxWaylandAdapter;
