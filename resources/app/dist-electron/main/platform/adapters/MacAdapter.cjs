"use strict";
/**
 * MacAdapter — macOS platform adapter.
 *
 * Encapsulates macOS-specific app configuration, native hotkey registration
 * strategy, dock badge, tray behavior, and menu configuration. macOS stays
 * in the dock when all windows are closed.
 *
 * @module MacAdapter
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MacAdapter = void 0;
/** Default WaylandStatus for non-Linux platforms */
const DEFAULT_WAYLAND_STATUS = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};
class MacAdapter {
    id = 'mac';
    /**
     * Apply macOS-specific app configuration at startup.
     * Sets the display name shown in the menu bar and Dock.
     */
    applyAppConfiguration(app, _logger) {
        app.setName('Gemini Desktop');
    }
    /**
     * No-op on macOS — AppUserModelId is Windows-only.
     */
    applyAppUserModelId(_app) {
        // No-op on macOS
    }
    /**
     * macOS uses Electron's native globalShortcut API.
     */
    getHotkeyRegistrationPlan() {
        return {
            mode: 'native',
            waylandStatus: DEFAULT_WAYLAND_STATUS,
        };
    }
    /**
     * macOS is not Wayland — return default (all-false) status.
     */
    getWaylandStatus() {
        return DEFAULT_WAYLAND_STATUS;
    }
    /**
     * macOS stays in the dock when all windows are closed.
     */
    shouldQuitOnWindowAllClosed() {
        return false;
    }
    getTitleBarStyle() {
        return 'hidden';
    }
    getAppIconFilename() {
        return 'icon.png';
    }
    getTrayIconFilename() {
        return 'icon-mac-trayTemplate.png';
    }
    shouldDisableUpdates(_env) {
        return true;
    }
    supportsAutoUpdate(_env = process.env) {
        return false;
    }
    async requestMediaPermissions(logger) {
        const { systemPreferences } = await Promise.resolve().then(() => __importStar(require('electron')));
        if (systemPreferences.askForMediaAccess) {
            const granted = await systemPreferences.askForMediaAccess('microphone');
            logger.log(`macOS microphone access: ${granted ? 'granted' : 'denied'}`);
        }
    }
    getNotificationSupportHint() {
        return undefined;
    }
    // ----- Badge methods -----
    supportsBadges() {
        return true;
    }
    showBadge(params, app) {
        app?.dock?.setBadge(params.text);
    }
    clearBadge(_params, app) {
        app?.dock?.setBadge('');
    }
    // ----- Window methods -----
    getMainWindowPlatformConfig() {
        return {};
    }
    /**
     * macOS: only hide, do NOT skip taskbar (Dock stays visible).
     */
    hideToTray(window) {
        window.hide();
    }
    /**
     * macOS: show and focus, no taskbar restoration needed.
     */
    restoreFromTray(window) {
        window.show();
        window.focus();
    }
    // ----- Menu methods -----
    shouldIncludeAppMenu() {
        return true;
    }
    getSettingsMenuLabel() {
        return 'Settings...';
    }
    getWindowCloseRole() {
        return 'close';
    }
    getDockMenuTemplate(callbacks) {
        return [
            {
                label: 'Show Gemini',
                click: () => callbacks.restoreFromTray(),
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => callbacks.createOptionsWindow(),
            },
        ];
    }
}
exports.MacAdapter = MacAdapter;
