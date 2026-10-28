"use strict";
/**
 * Theme IPC Handler.
 *
 * Handles IPC channels for theme management:
 * - theme:get - Returns current theme preference and effective theme
 * - theme:set - Sets the theme preference
 *
 * @module ipc/ThemeIpcHandler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
/** Valid theme preference values */
const VALID_THEMES = ['light', 'dark', 'system'];
/**
 * Handler for theme-related IPC channels.
 *
 * Manages theme persistence, nativeTheme synchronization, and broadcasting
 * theme changes to all windows.
 */
class ThemeIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    /**
     * Register theme IPC handlers with ipcMain.
     */
    register() {
        // Get current theme preference and effective theme
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.THEME_GET, () => {
            return this._handleGetTheme();
        });
        // Set theme preference
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.THEME_SET, (_event, theme) => {
            this._handleSetTheme(theme);
        });
    }
    /**
     * Initialize nativeTheme based on stored preference.
     * Called during handler initialization.
     */
    initialize() {
        try {
            const savedTheme = this.deps.store.get('theme') || 'system';
            electron_1.nativeTheme.themeSource = savedTheme;
            this.logger.log(`Native theme initialized to: ${savedTheme}`);
        }
        catch (error) {
            this.handleError('initializing native theme', error);
        }
    }
    /**
     * Handle theme:get request.
     * @returns Current theme preference and effective theme
     */
    _handleGetTheme() {
        try {
            const preference = this.deps.store.get('theme') || 'system';
            const effectiveTheme = electron_1.nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
            return { preference, effectiveTheme };
        }
        catch (error) {
            this.logger.error('Error getting theme:', error);
            return { preference: 'system', effectiveTheme: 'dark' };
        }
    }
    /**
     * Handle theme:set request.
     * @param theme - The theme preference to set
     */
    _handleSetTheme(theme) {
        try {
            // Validate theme value
            if (!VALID_THEMES.includes(theme)) {
                this.logger.warn(`Invalid theme value: ${theme}`);
                return;
            }
            // Persist preference
            this.deps.store.set('theme', theme);
            // Update native theme (affects nativeTheme.shouldUseDarkColors)
            electron_1.nativeTheme.themeSource = theme;
            // Compute effective theme after nativeTheme update
            const effectiveTheme = electron_1.nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
            this.logger.log(`Theme set to: ${theme} (effective: ${effectiveTheme})`);
            // Broadcast to all windows
            this._broadcastThemeChange(theme, effectiveTheme);
        }
        catch (error) {
            this.logger.error('Error setting theme:', {
                error: error.message,
                requestedTheme: theme,
            });
        }
    }
    /**
     * Broadcast theme change to all open windows.
     * @param preference - The theme preference
     * @param effectiveTheme - The resolved effective theme
     */
    _broadcastThemeChange(preference, effectiveTheme) {
        this.broadcastToAllWindows(constants_1.IPC_CHANNELS.THEME_CHANGED, {
            preference,
            effectiveTheme,
        });
    }
    /** Unregister all IPC handlers. */
    unregister() {
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.THEME_GET);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.THEME_SET);
    }
}
exports.ThemeIpcHandler = ThemeIpcHandler;
