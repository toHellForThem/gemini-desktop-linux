"use strict";
/**
 * Badge Manager for the Electron main process.
 * Handles platform-specific dock/taskbar badges for update and response notifications.
 *
 * @module BadgeManager
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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = require("../utils/logger.cjs");
const platformAdapterFactory_1 = require("../platform/platformAdapterFactory.cjs");
const logger = (0, logger_1.createLogger)('[BadgeManager]');
/**
 * Manages dock (macOS) and taskbar (Windows) badges.
 *
 * ## Platform Support
 * - **macOS**: Uses `app.dock.setBadge()` to show text badge on dock icon
 * - **Windows**: Uses `BrowserWindow.setOverlayIcon()` to show overlay on taskbar
 * - **Linux**: No native badge API (gracefully skipped)
 *
 * @class BadgeManager
 */
class BadgeManager {
    /** Reference to main window for Windows overlay */
    mainWindow = null;
    /** Badge overlay icon for Windows */
    badgeIcon = null;
    /** Current update badge state */
    hasUpdateBadge = false;
    /** Current notification badge state */
    hasNotificationBadge = false;
    /** Platform adapter for badge rendering */
    adapter;
    constructor(adapter) {
        this.adapter = adapter ?? (0, platformAdapterFactory_1.getPlatformAdapter)();
        logger.log('BadgeManager initialized');
        this.loadBadgeIcon();
    }
    /**
     * Set the main window reference (needed for Windows overlay).
     * @param window - The main BrowserWindow instance
     */
    setMainWindow(window) {
        this.mainWindow = window;
        logger.log('Main window reference set');
    }
    /**
     * Load the badge overlay icon for Windows.
     * @private
     */
    loadBadgeIcon() {
        if (!this.adapter.supportsBadges() || this.adapter.id === 'mac')
            return;
        try {
            // Look for badge icon in build directory
            const iconPath = path.join(__dirname, '../../build/badge-icon.png');
            if (fs.existsSync(iconPath)) {
                this.badgeIcon = electron_1.nativeImage.createFromPath(iconPath);
                logger.log('Badge icon loaded from:', iconPath);
            }
            else {
                // Create a simple red dot programmatically as fallback
                this.badgeIcon = this.createDefaultBadgeIcon();
                logger.log('Using default badge icon');
            }
        }
        catch (error) {
            logger.error('Failed to load badge icon:', error);
            this.badgeIcon = this.createDefaultBadgeIcon();
        }
    }
    /**
     * Create a default green dot badge icon programmatically.
     * Uses raw pixel data in BGRA format (Windows native format).
     * @private
     * @returns NativeImage of a green dot
     */
    createDefaultBadgeIcon() {
        const size = 16;
        const radius = 3; // Small, compact dot
        const centerX = size / 2;
        const centerY = size / 2;
        // Create BGRA buffer (Windows native format - 4 bytes per pixel)
        const buffer = Buffer.alloc(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const index = (y * size + x) * 4;
                // Calculate distance from center
                const dx = x - centerX + 0.5;
                const dy = y - centerY + 0.5;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= radius) {
                    // Google Green (#34a853) - solid color, no anti-aliasing for cleaner look
                    // BGRA format for Windows: #34a853 = R:52, G:168, B:83
                    buffer[index] = 83; // B
                    buffer[index + 1] = 168; // G
                    buffer[index + 2] = 52; // R
                    buffer[index + 3] = 255; // A - fully opaque
                }
                else {
                    // Transparent
                    buffer[index] = 0;
                    buffer[index + 1] = 0;
                    buffer[index + 2] = 0;
                    buffer[index + 3] = 0;
                }
            }
        }
        try {
            return electron_1.nativeImage.createFromBuffer(buffer, {
                width: size,
                height: size,
            });
        }
        catch (error) {
            logger.error('Failed to create badge icon from buffer:', error);
            return electron_1.nativeImage.createEmpty();
        }
    }
    /**
     * Internal method to show the badge on dock/taskbar.
     * Called by both update and notification badge methods.
     * @private
     */
    showBadge(description, text = '•') {
        try {
            if (!this.adapter.supportsBadges()) {
                logger.log('Linux: Native badge not supported, skipping');
                return;
            }
            if (this.adapter.id === 'windows') {
                // Windows: need to check window/icon availability before delegating
                if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.badgeIcon) {
                    logger.warn('Cannot set Windows overlay: window or icon not available');
                    return;
                }
            }
            this.adapter.showBadge({ window: this.mainWindow, description, text, overlayIcon: this.badgeIcon }, electron_1.app);
            logger.log(this.adapter.id === 'mac' ? `macOS dock badge set: ${text}` : 'Windows taskbar overlay set');
        }
        catch (error) {
            /* v8 ignore next 2 -- defensive error handling */
            logger.error('Failed to show badge:', error);
        }
    }
    /**
     * Internal method to clear the badge from dock/taskbar.
     * Only clears if no badges of any type are active.
     * @private
     */
    clearBadgeIfNoneActive() {
        if (this.hasUpdateBadge || this.hasNotificationBadge) {
            return; // Another badge type is still active
        }
        try {
            if (!this.adapter.supportsBadges()) {
                return; // Linux: Nothing to clear
            }
            this.adapter.clearBadge({ window: this.mainWindow }, electron_1.app);
            logger.log(this.adapter.id === 'mac' ? 'macOS dock badge cleared' : 'Windows taskbar overlay cleared');
        }
        catch (error) {
            /* v8 ignore next 2 -- defensive error handling */
            logger.error('Failed to clear badge:', error);
        }
    }
    /**
     * Show the update badge on dock/taskbar.
     * @param text - Optional text to show (macOS only, defaults to "•")
     */
    showUpdateBadge(text = '•') {
        if (this.hasUpdateBadge) {
            logger.log('Update badge already shown');
            return;
        }
        this.hasUpdateBadge = true;
        this.showBadge('Update available', text);
    }
    /**
     * Clear the update badge from dock/taskbar.
     */
    clearUpdateBadge() {
        if (!this.hasUpdateBadge) {
            return;
        }
        this.hasUpdateBadge = false;
        this.clearBadgeIfNoneActive();
    }
    /**
     * Show the notification badge on dock/taskbar.
     * Used for response notifications when the window is unfocused.
     * @param text - Optional text to show (macOS only, defaults to "•")
     */
    showNotificationBadge(text = '•') {
        if (this.hasNotificationBadge) {
            logger.log('Notification badge already shown');
            return;
        }
        this.hasNotificationBadge = true;
        this.showBadge('Response ready', text);
    }
    /**
     * Clear the notification badge from dock/taskbar.
     */
    clearNotificationBadge() {
        if (!this.hasNotificationBadge) {
            return;
        }
        this.hasNotificationBadge = false;
        this.clearBadgeIfNoneActive();
    }
    /**
     * Check if any badge is currently shown.
     * @returns True if any badge (update or notification) is visible
     */
    hasBadgeShown() {
        return this.hasUpdateBadge || this.hasNotificationBadge;
    }
    /**
     * Check if notification badge is currently shown.
     * @returns True if notification badge is visible
     */
    hasNotificationBadgeShown() {
        return this.hasNotificationBadge;
    }
}
exports.default = BadgeManager;
