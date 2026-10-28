"use strict";
/**
 * Notification Manager for the Electron main process.
 * Handles native OS notifications and taskbar badges for response notifications.
 *
 * @module NotificationManager
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
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const logger_1 = require("../utils/logger.cjs");
const constants_1 = require("../utils/constants.cjs");
const paths_1 = require("../utils/paths.cjs");
const platformAdapterFactory_1 = require("../platform/platformAdapterFactory.cjs");
const logger = (0, logger_1.createLogger)('[NotificationManager]');
/**
 * Manages native OS notifications and taskbar badges for response notifications.
 *
 * ## Features
 * - Shows native OS notification when Gemini response completes and window is unfocused
 * - Shows taskbar badge (via BadgeManager) when unfocused
 * - Clears badge when window regains focus
 * - Respects user setting for enabling/disabling notifications
 *
 * @class NotificationManager
 */
class NotificationManager {
    /** Reference to main window for focus tracking */
    mainWindow;
    /** BadgeManager for taskbar badges */
    badgeManager;
    /** Settings store for persisting preferences */
    store;
    /** PlatformAdapter for platform-specific notification hints */
    platformAdapter;
    /** Current focus state of the main window */
    _isWindowFocused;
    /** Bound reference to onWindowFocus for proper listener removal */
    boundOnWindowFocus;
    /** Bound reference to onWindowBlur for proper listener removal */
    boundOnWindowBlur;
    /** Track active notifications for cleanup on dispose (Task 12.10) */
    activeNotifications = new Set();
    /**
     * Creates a new NotificationManager instance.
     * @param mainWindow - The main BrowserWindow instance
     * @param badgeManager - BadgeManager for taskbar badges
     * @param store - Settings store for persisting notification preferences
     * @param platformAdapter - PlatformAdapter for platform-specific behavior
     */
    constructor(mainWindow, badgeManager, store, platformAdapter) {
        this.mainWindow = mainWindow;
        this.badgeManager = badgeManager;
        this.store = store;
        this.platformAdapter = platformAdapter ?? (0, platformAdapterFactory_1.getPlatformAdapter)();
        // Initialize focus state - check if window is currently focused
        this._isWindowFocused = mainWindow.isFocused();
        // Store bound function references for proper listener removal in dispose()
        // .bind() creates a new function each call, so we must store the reference
        this.boundOnWindowFocus = this.onWindowFocus.bind(this);
        this.boundOnWindowBlur = this.onWindowBlur.bind(this);
        // Subscribe to window focus/blur events using stored references
        this.mainWindow.on('focus', this.boundOnWindowFocus);
        this.mainWindow.on('blur', this.boundOnWindowBlur);
        logger.log('NotificationManager initialized');
    }
    /**
     * Handler for window focus event.
     * Clears notification badge when window regains focus.
     * @private
     */
    onWindowFocus() {
        // Check if window is destroyed before accessing state (task 11.4)
        if (this.mainWindow.isDestroyed()) {
            logger.log('Window focus event ignored - window is destroyed');
            return;
        }
        this._isWindowFocused = true;
        // Clear notification badge when window regains focus (task 12.4: null guard)
        if (!this.badgeManager) {
            logger.warn('BadgeManager not available - cannot clear notification badge');
        }
        else {
            this.badgeManager.clearNotificationBadge();
        }
        logger.log('Window focused, notification badge cleared');
    }
    /**
     * Handler for window blur event.
     * @private
     */
    onWindowBlur() {
        // Check if window is destroyed before accessing state (task 11.4)
        if (this.mainWindow.isDestroyed()) {
            logger.log('Window blur event ignored - window is destroyed');
            return;
        }
        this._isWindowFocused = false;
        logger.log('Window blurred');
    }
    /**
     * Check if the main window is currently focused.
     * @returns True if the window is focused
     */
    get isWindowFocused() {
        return this._isWindowFocused;
    }
    /**
     * Handle a completed Gemini response.
     * Shows notification and badge if window is unfocused and notifications are enabled.
     * Each operation is wrapped in try/catch so one failure doesn't block the other.
     */
    onResponseComplete() {
        // Check if notifications are enabled
        if (!this.isEnabled()) {
            logger.log('Response complete, but notifications disabled');
            return;
        }
        // Check if window is focused
        if (this._isWindowFocused) {
            logger.log('Response complete, but window is focused - no notification');
            return;
        }
        // Show notification (task 11.1: wrapped in try/catch)
        try {
            this.showNotification();
        }
        catch (error) {
            logger.error('Failed to show notification:', error);
        }
        // Show badge (task 11.1: wrapped independently so notification failure doesn't block badge)
        // Task 12.4: null guard for badgeManager
        try {
            if (!this.badgeManager) {
                logger.warn('BadgeManager not available - cannot show notification badge');
            }
            else {
                this.badgeManager.showNotificationBadge();
            }
        }
        catch (error) {
            logger.error('Failed to show notification badge:', error);
        }
        logger.log('Response complete - notification and badge shown');
    }
    /**
     * Check if response notifications are enabled.
     * Always returns a boolean, defaulting to true for null/undefined values.
     * @returns True if notifications are enabled
     */
    isEnabled() {
        const value = this.store.get('responseNotificationsEnabled');
        // Handle null/undefined - default to true
        if (value === null || value === undefined) {
            return true;
        }
        // Ensure we always return a boolean
        return value === true;
    }
    /**
     * Enable or disable response notifications.
     * Validates that enabled is a boolean before persisting.
     * @param enabled - Whether to enable notifications
     */
    setEnabled(enabled) {
        // Type validation (task 11.3)
        if (typeof enabled !== 'boolean') {
            logger.warn(`setEnabled received non-boolean value: ${typeof enabled} (${enabled})`);
            return;
        }
        // Task 12.2: wrap store.set() in try/catch for graceful failure
        try {
            this.store.set('responseNotificationsEnabled', enabled);
            logger.log(`Response notifications ${enabled ? 'enabled' : 'disabled'}`);
        }
        catch (error) {
            logger.error('Failed to persist response notifications setting:', error);
        }
    }
    /**
     * Show a native OS notification for a completed response.
     * Returns early if notifications are not supported on the platform.
     * Logs platform-specific guidance when notifications are not supported.
     */
    showNotification() {
        // Check if notifications are supported on this platform
        if (!electron_1.Notification.isSupported()) {
            const hint = this.platformAdapter.getNotificationSupportHint();
            if (hint) {
                logger.warn(hint);
            }
            else {
                logger.log('Notifications not supported on this platform');
            }
            return;
        }
        // Resolve icon path for notifications (Windows and Linux)
        // macOS ignores this and uses the app bundle icon instead
        // Uses centralized helper that supports Flatpak, AppImage, deb, rpm, etc.
        let iconPath = (0, paths_1.getNotificationIconPath)();
        // Verify icon path exists before using (task 11.7)
        if (iconPath && !fs.existsSync(iconPath)) {
            logger.warn(`Notification icon not found at path: ${iconPath} - notification will show without icon`);
            iconPath = undefined;
        }
        // Wrap Notification constructor and show() in try/catch (task 11.2)
        let notification;
        try {
            notification = new electron_1.Notification({
                title: constants_1.APP_NAME,
                body: 'Response ready',
                silent: false,
                icon: iconPath,
            });
        }
        catch (error) {
            logger.error('Failed to create notification:', error);
            return;
        }
        notification.on('click', () => {
            this.focusMainWindow();
        });
        // Task 12.10: Track notification for cleanup on dispose
        this.activeNotifications.add(notification);
        // Remove from tracking when notification is closed/dismissed
        notification.on('close', () => {
            this.activeNotifications.delete(notification);
        });
        try {
            notification.show();
            logger.log('Notification shown');
        }
        catch (error) {
            logger.error('Failed to show notification:', error);
        }
    }
    /**
     * Focus and restore the main window.
     * Called when a notification is clicked.
     * Handles restoring minimized windows before focusing.
     * @private
     */
    focusMainWindow() {
        if (this.mainWindow.isDestroyed()) {
            logger.log('Cannot focus - main window is destroyed');
            return;
        }
        if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
        logger.log('Main window focused via notification click');
    }
    /** Whether dispose() has already been called */
    _isDisposed = false;
    /**
     * Clean up resources when the manager is disposed.
     * Removes focus/blur event listeners from the main window.
     * Safe to call multiple times (idempotent).
     */
    dispose() {
        if (this._isDisposed) {
            logger.log('NotificationManager already disposed, skipping');
            return;
        }
        this._isDisposed = true;
        // Remove event listeners if window is still valid
        // Use stored bound references (same ones used in constructor registration)
        if (!this.mainWindow.isDestroyed()) {
            this.mainWindow.removeListener('focus', this.boundOnWindowFocus);
            this.mainWindow.removeListener('blur', this.boundOnWindowBlur);
        }
        // Task 12.10: Close any pending notifications
        for (const notification of this.activeNotifications) {
            try {
                notification.close();
            }
            catch {
                // Notification may already be closed, ignore
            }
        }
        this.activeNotifications.clear();
        logger.log('NotificationManager disposed');
    }
}
exports.default = NotificationManager;
