"use strict";
/**
 * Window Manager for the Electron main process.
 * Facade/coordinator for all application windows.
 *
 * This class delegates window-specific logic to dedicated window classes
 * and provides a unified interface for window management.
 *
 * @module WindowManager
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZOOM_LEVEL_STEPS = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger.cjs");
const constants_1 = require("../utils/constants.cjs");
const store_1 = __importDefault(require("../store.cjs"));
const micActivation_1 = require("../utils/micActivation.cjs");
const mainWindow_1 = __importDefault(require("../windows/mainWindow.cjs"));
const authWindow_1 = __importDefault(require("../windows/authWindow.cjs"));
const optionsWindow_1 = __importDefault(require("../windows/optionsWindow.cjs"));
const quickChatWindow_1 = __importDefault(require("../windows/quickChatWindow.cjs"));
const tabs_1 = require("../../shared/types/tabs.cjs");
const logger = (0, logger_1.createLogger)('[WindowManager]');
/**
 * Standard zoom level steps matching Chrome/Firefox behavior.
 * Range: 50% to 200% inclusive.
 */
exports.ZOOM_LEVEL_STEPS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];
const TAB_STATE_CONFIG_NAME = 'tabs-state';
class WindowManager extends events_1.EventEmitter {
    isDev;
    mainWindow;
    optionsWindow;
    authWindow;
    quickChatWindow;
    _zoomLevel = 100;
    tabStateStore;
    /**
     * Creates a new WindowManager instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev) {
        super();
        this.isDev = isDev;
        // Initialize window instances
        this.mainWindow = new mainWindow_1.default(isDev);
        this.optionsWindow = new optionsWindow_1.default(isDev);
        this.authWindow = new authWindow_1.default(isDev);
        this.quickChatWindow = new quickChatWindow_1.default(isDev);
        this.tabStateStore = new store_1.default({
            configName: TAB_STATE_CONFIG_NAME,
            defaults: {
                tabsState: null,
            },
        });
        // Wire up callbacks between windows
        this.mainWindow.setAuthWindowCallback((url) => this.createAuthWindow(url));
        this.mainWindow.setCloseOptionsCallback(() => this.optionsWindow.close());
        this.mainWindow.setCloseAuthCallback(() => this.authWindow.close());
        // Forward always-on-top events from MainWindow
        this.mainWindow.on('always-on-top-changed', (enabled) => {
            this.emit('always-on-top-changed', enabled);
        });
        this.mainWindow.on('focus', () => {
            this.quickChatWindow.handleMainWindowFocus();
        });
    }
    /**
     * Create an authentication window for Google sign-in.
     * @param url - The URL to load in the auth window
     * @returns The created auth window
     */
    createAuthWindow(url) {
        try {
            const win = this.authWindow.create(url);
            // After a successful sign-in, reload the Gemini iframe so it picks
            // up the new session cookies. The auth window shares the default
            // session with the main window.
            this.authWindow.once('authenticated', () => {
                setTimeout(() => {
                    try {
                        this.mainWindow.reloadGeminiFrames();
                    }
                    catch (error) {
                        logger.error('Failed to reload Gemini frames after sign-in:', error);
                    }
                }, 500);
            });
            return win;
        }
        catch (error) {
            logger.error('Failed to create auth window:', error);
            throw error; // Re-throw as auth is critical for sign-in
        }
    }
    /**
     * Create the main application window.
     * @param options - Optional creation options
     * @returns The main window
     */
    createMainWindow(options) {
        logger.debug('createMainWindow() called');
        try {
            logger.debug('About to call mainWindow.create()');
            const win = this.mainWindow.create({ startHidden: options?.startHidden });
            logger.debug('mainWindow.create() returned, window:', win ? 'exists' : 'null');
            return win;
        }
        catch (error) {
            logger.error('CRITICAL: Failed to create main window:', error);
            throw error; // Re-throw as main window is essential
        }
    }
    /**
     * Create or focus the options window.
     * @param tab - Optional tab to open ('settings' or 'about')
     * @returns The options window
     */
    createOptionsWindow(tab) {
        try {
            return this.optionsWindow.create(tab);
        }
        catch (error) {
            logger.error('Failed to create options window:', error);
            throw error;
        }
    }
    /**
     * Get the main window instance.
     * @returns The main window or null
     */
    getMainWindow() {
        return this.mainWindow.getWindow();
    }
    /**
     * Get the MainWindow class instance (for event subscription).
     * @returns The MainWindow instance
     */
    getMainWindowInstance() {
        return this.mainWindow;
    }
    /**
     * Minimize the main window.
     */
    minimizeMainWindow() {
        this.mainWindow.minimize();
    }
    /**
     * Hide the main window to tray.
     */
    hideToTray() {
        this.mainWindow.hideToTray();
    }
    /**
     * Restore the main window from tray.
     */
    restoreFromTray() {
        this.mainWindow.restoreFromTray();
    }
    /**
     * Check if the main window is visible.
     * @returns True if visible, false otherwise
     */
    isMainWindowVisible() {
        const win = this.mainWindow.getWindow();
        return win ? win.isVisible() : false;
    }
    /**
     * Toggle main window visibility: hide if visible, restore if hidden/null.
     */
    toggleMainWindowVisibility() {
        if (this.isMainWindowVisible()) {
            this.hideToTray();
        }
        else {
            if (this.mainWindow.isValid()) {
                this.restoreFromTray();
            }
            else {
                this.createMainWindow({ startHidden: false });
                this.focusMainWindow();
            }
        }
    }
    /**
     * Create the Quick Chat floating window.
     * @returns The Quick Chat window
     */
    createQuickChatWindow() {
        try {
            return this.quickChatWindow.create();
        }
        catch (error) {
            logger.error('Failed to create Quick Chat window:', error);
            throw error;
        }
    }
    /**
     * Show and focus the Quick Chat window.
     */
    showQuickChat() {
        this.quickChatWindow.showAndFocus();
    }
    /**
     * Hide the Quick Chat window.
     */
    hideQuickChat() {
        this.quickChatWindow.hide();
    }
    /**
     * Toggle Quick Chat window visibility.
     */
    toggleQuickChat() {
        this.quickChatWindow.toggle();
    }
    /**
     * Get the Quick Chat window instance.
     * @returns The Quick Chat window or null
     */
    getQuickChatWindow() {
        return this.quickChatWindow.getWindow();
    }
    /**
     * Focus the main window and bring to front.
     */
    focusMainWindow() {
        this.mainWindow.show();
        this.mainWindow.focus();
        logger.log('Main window focused');
    }
    async activateVoiceChat() {
        try {
            if (!this.mainWindow.isValid()) {
                this.createMainWindow({ startHidden: false });
            }
            if (this.isMainWindowVisible()) {
                this.focusMainWindow();
            }
            else {
                this.restoreFromTray();
            }
            const mainWindow = this.getMainWindow();
            if (!mainWindow) {
                logger.debug('Voice chat activation skipped: main window not available');
                return;
            }
            const frames = mainWindow.webContents.mainFrame.frames;
            const tabState = this.tabStateStore.get('tabsState');
            const activeTabId = tabState?.activeTabId;
            const targetFrameName = activeTabId ? (0, tabs_1.getTabFrameName)(activeTabId) : null;
            const targetFrame = targetFrameName ? frames.find((frame) => frame.name === targetFrameName) : undefined;
            if (!targetFrame) {
                const fallbackFrame = frames.find((frame) => (0, constants_1.isGeminiDomain)(frame.url));
                if (!fallbackFrame) {
                    logger.debug('Voice chat activation skipped: active tab frame not found', {
                        activeTabId,
                        targetFrameName,
                        framesCount: frames.length,
                        frameNames: frames.map((frame) => frame.name),
                    });
                    return;
                }
                const fallbackResult = await (0, micActivation_1.activateMicrophoneInFrame)(fallbackFrame);
                if (fallbackResult.success) {
                    logger.log('Voice chat microphone activation succeeded');
                }
                else {
                    logger.error('Voice chat microphone activation failed', fallbackResult.error);
                }
                return;
            }
            if (!(0, constants_1.isGeminiDomain)(targetFrame.url)) {
                logger.debug('Voice chat activation skipped: active frame not Gemini domain', {
                    url: targetFrame.url,
                });
                return;
            }
            const result = await (0, micActivation_1.activateMicrophoneInFrame)(targetFrame);
            if (result.success) {
                logger.log('Voice chat microphone activation succeeded');
            }
            else {
                logger.error('Voice chat microphone activation failed', result.error);
            }
        }
        catch (error) {
            logger.error('Failed to activate voice chat:', error);
        }
    }
    /**
     * Set the quitting state.
     * @param state - Whether the app is quitting
     */
    setQuitting(state) {
        this.mainWindow.setQuitting(state);
    }
    /**
     * Set the always-on-top state for the main window.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop(enabled) {
        this.mainWindow.setAlwaysOnTop(enabled);
    }
    /**
     * Get the current always-on-top state.
     * @returns True if always-on-top is enabled
     */
    isAlwaysOnTop() {
        return this.mainWindow.isAlwaysOnTop();
    }
    /**
     * Get the current zoom level percentage.
     * @returns The zoom level as a percentage (e.g., 100 for 100%)
     */
    getZoomLevel() {
        return this._zoomLevel;
    }
    /**
     * Validate and sanitize a zoom level value.
     * Returns the closest valid zoom step if the value is invalid or out of range.
     * @param level - The zoom level to validate (percentage)
     * @returns A valid zoom level percentage
     */
    _sanitizeZoomLevel(level) {
        // Handle invalid types
        if (typeof level !== 'number' || isNaN(level) || !isFinite(level)) {
            return 100; // Default to 100%
        }
        // Clamp to valid range
        const minZoom = exports.ZOOM_LEVEL_STEPS[0] ?? 100;
        const maxZoom = exports.ZOOM_LEVEL_STEPS[exports.ZOOM_LEVEL_STEPS.length - 1] ?? minZoom;
        if (level <= minZoom)
            return minZoom;
        if (level >= maxZoom)
            return maxZoom;
        // Find the nearest valid step
        return this._findNearestZoomStep(level);
    }
    /**
     * Find the nearest valid zoom step for a given level.
     * @param level - The zoom level to find nearest step for
     * @returns The nearest valid zoom step
     */
    _findNearestZoomStep(level) {
        let nearestStep = exports.ZOOM_LEVEL_STEPS[0];
        let minDistance = Math.abs(level - nearestStep);
        for (const step of exports.ZOOM_LEVEL_STEPS) {
            const distance = Math.abs(level - step);
            if (distance < minDistance) {
                minDistance = distance;
                nearestStep = step;
            }
        }
        return nearestStep;
    }
    /**
     * Apply the current zoom level to the main window's webContents.
     * Silently returns if window is unavailable.
     * @private
     */
    _applyZoomToWindow() {
        const win = this.getMainWindow();
        if (!win || win.isDestroyed()) {
            logger.warn('Cannot apply zoom: main window unavailable');
            return;
        }
        try {
            // WebContents.setZoomFactor uses a multiplier (1.0 = 100%)
            const zoomFactor = this._zoomLevel / 100;
            win.webContents.setZoomFactor(zoomFactor);
            logger.log(`Zoom applied: ${this._zoomLevel}% (factor: ${zoomFactor})`);
        }
        catch (error) {
            logger.error('Failed to apply zoom to window:', error);
        }
    }
    /**
     * Set the zoom level for the main window.
     * Validates the level and persists/broadcasts the change.
     * @param level - The zoom level percentage (50-200)
     */
    setZoomLevel(level) {
        const sanitizedLevel = this._sanitizeZoomLevel(level);
        // Avoid unnecessary updates
        if (sanitizedLevel === this._zoomLevel) {
            return;
        }
        this._zoomLevel = sanitizedLevel;
        this._applyZoomToWindow();
        this.emit('zoom-level-changed', sanitizedLevel);
        logger.log(`Zoom level set to: ${sanitizedLevel}%`);
    }
    /**
     * Zoom in to the next zoom step.
     * Capped at 200%.
     */
    zoomIn() {
        const steps = exports.ZOOM_LEVEL_STEPS;
        const currentIndex = steps.indexOf(this._zoomLevel);
        if (currentIndex === -1) {
            // Current zoom is not a standard step, snap to next higher step
            const nextStep = exports.ZOOM_LEVEL_STEPS.find((step) => step > this._zoomLevel);
            if (nextStep !== undefined) {
                this.setZoomLevel(nextStep);
            }
            else {
                // Already at or above max, set to max
                const maxStep = exports.ZOOM_LEVEL_STEPS[exports.ZOOM_LEVEL_STEPS.length - 1] ?? this._zoomLevel;
                this.setZoomLevel(maxStep);
            }
        }
        else if (currentIndex < exports.ZOOM_LEVEL_STEPS.length - 1) {
            // Move to next step
            const nextStep = exports.ZOOM_LEVEL_STEPS[currentIndex + 1];
            if (nextStep !== undefined) {
                this.setZoomLevel(nextStep);
            }
        }
        // else: already at max, do nothing
    }
    /**
     * Zoom out to the previous zoom step.
     * Capped at 50%.
     */
    zoomOut() {
        const steps = exports.ZOOM_LEVEL_STEPS;
        const currentIndex = steps.indexOf(this._zoomLevel);
        if (currentIndex === -1) {
            // Current zoom is not a standard step, snap to next lower step
            const reversedSteps = [...exports.ZOOM_LEVEL_STEPS].reverse();
            const nextStep = reversedSteps.find((step) => step < this._zoomLevel);
            if (nextStep !== undefined) {
                this.setZoomLevel(nextStep);
            }
            else {
                // Already at or below min, set to min
                const minStep = exports.ZOOM_LEVEL_STEPS[0] ?? this._zoomLevel;
                this.setZoomLevel(minStep);
            }
        }
        else if (currentIndex > 0) {
            // Move to previous step
            const previousStep = exports.ZOOM_LEVEL_STEPS[currentIndex - 1];
            if (previousStep !== undefined) {
                this.setZoomLevel(previousStep);
            }
        }
        // else: already at min, do nothing
    }
    /**
     * Initialize zoom level from a stored value.
     * Called during app initialization to restore persisted zoom.
     * @param level - The stored zoom level (may be invalid)
     */
    initializeZoomLevel(level) {
        this._zoomLevel = this._sanitizeZoomLevel(level);
        logger.log(`Zoom level initialized to: ${this._zoomLevel}%`);
    }
    /**
     * Apply the current zoom level to the main window.
     * Called after main window is created to restore persisted zoom.
     */
    applyZoomLevel() {
        this._applyZoomToWindow();
    }
}
exports.default = WindowManager;
