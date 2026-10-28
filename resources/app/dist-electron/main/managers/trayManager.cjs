"use strict";
/**
 * Tray Manager for the Electron main process.
 * Handles system tray icon and context menu functionality.
 *
 * @module TrayManager
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
const paths_1 = require("../utils/paths.cjs");
const constants_1 = require("../utils/constants.cjs");
const logger_1 = require("../utils/logger.cjs");
const platformAdapterFactory_1 = require("../platform/platformAdapterFactory.cjs");
const logger = (0, logger_1.createLogger)('[TrayManager]');
/**
 * Manages the system tray icon and context menu.
 *
 * ## Features
 * - Creates system tray icon with app icon
 * - Provides context menu for show/quit actions
 * - Handles tray click to restore window
 * - Cross-platform support (Windows, macOS, Linux)
 *
 * @class TrayManager
 */
class TrayManager {
    /** Reference to the window manager */
    windowManager;
    /** The system tray instance */
    tray = null;
    /** Track current tooltip for E2E testing */
    currentToolTip = constants_1.TRAY_TOOLTIP;
    /**
     * Creates a new TrayManager instance.
     * @param windowManager - The WindowManager instance for window control
     */
    constructor(windowManager) {
        this.windowManager = windowManager;
        logger.log('TrayManager initialized');
    }
    /**
     * Create and configure the system tray icon.
     * @returns The created Tray instance
     */
    createTray() {
        try {
            if (this.tray) {
                logger.warn('Tray already exists, returning existing instance');
                return this.tray;
            }
            let iconPath = (0, paths_1.getTrayIconPath)();
            if (!fs.existsSync(iconPath)) {
                logger.warn(`Tray icon not found: ${iconPath}, falling back to app icon`);
                iconPath = (0, paths_1.getIconPath)();
                if (!fs.existsSync(iconPath)) {
                    throw new Error(`Icon not found: ${iconPath}`);
                }
            }
            // Create nativeImage for tray (required for proper icon handling)
            let trayIcon = electron_1.nativeImage.createFromPath(iconPath);
            if (trayIcon.isEmpty()) {
                throw new Error(`Failed to load tray icon: ${iconPath}`);
            }
            if ((0, platformAdapterFactory_1.getPlatformAdapter)().id === 'mac') {
                trayIcon = this.normalizeMacTrayImage(trayIcon);
                if (trayIcon.isEmpty()) {
                    throw new Error(`Failed to normalize tray icon: ${iconPath}`);
                }
            }
            this.tray = new electron_1.Tray(trayIcon);
            // Set tooltip
            this.tray.setToolTip(this.currentToolTip);
            // Build and set context menu
            const contextMenu = this._buildContextMenu();
            this.tray.setContextMenu(contextMenu);
            // Handle tray click to restore window
            this.tray.on('click', () => {
                logger.log('Tray icon clicked');
                this.windowManager.restoreFromTray();
            });
            logger.log('Tray created successfully');
            return this.tray;
        }
        catch (error) {
            /* v8 ignore next 2 -- defensive error handling, hard to trigger in tests */
            logger.error('Failed to create tray:', error);
            throw error;
        }
    }
    /**
     * Build the context menu from TRAY_MENU_ITEMS configuration.
     * @private
     * @returns The Menu instance
     */
    _buildContextMenu() {
        const menuTemplate = Object.values(constants_1.TRAY_MENU_ITEMS).map((item) => {
            if (item.isSeparator) {
                return { type: 'separator' };
            }
            return {
                label: item.label,
                accelerator: item.accelerator,
                click: () => this._handleMenuItemClick(item.id),
            };
        });
        return electron_1.Menu.buildFromTemplate(menuTemplate);
    }
    /**
     * Handle context menu item clicks.
     * @private
     * @param itemId - The id of the clicked menu item
     */
    _handleMenuItemClick(itemId) {
        logger.log('Menu item clicked:', itemId);
        switch (itemId) {
            case 'show':
                this.windowManager.restoreFromTray();
                break;
            case 'quit':
                electron_1.app.quit();
                break;
            /* v8 ignore next 2 -- fallback for unknown menu items, extensibility safety net */
            default:
                logger.warn('Unknown menu item:', itemId);
        }
    }
    /**
     * Execute a tray action programmatically.
     *
     * This method exists primarily for E2E testing, allowing tests to trigger
     * the same code path that would be executed when a user clicks the tray icon
     * or a tray menu item.
     *
     * @param action - The action to execute: 'click', 'show', or 'quit'
     */
    executeTrayAction(action) {
        logger.log(`Executing tray action programmatically: ${action}`);
        switch (action) {
            case 'click':
            case 'show':
                // Same as tray click handler
                this.windowManager.restoreFromTray();
                break;
            case 'quit':
                electron_1.app.quit();
                break;
        }
    }
    /**
     * Destroy the system tray icon.
     * Should be called on app quit.
     */
    destroyTray() {
        try {
            if (this.tray && !this.tray.isDestroyed()) {
                this.tray.destroy();
                logger.log('Tray destroyed');
            }
            this.tray = null;
        }
        catch (error) {
            /* v8 ignore next -- defensive error handling */
            logger.error('Failed to destroy tray:', error);
        }
    }
    /**
     * Get the tray instance.
     * @returns The Tray instance or null if not created
     */
    getTray() {
        return this.tray;
    }
    /**
     * Get current tooltip text.
     * @returns The current tooltip string
     */
    getToolTip() {
        return this.currentToolTip;
    }
    /**
     * Set the tray tooltip to show an update notification.
     * @param version - The update version available
     */
    setUpdateTooltip(version) {
        if (this.tray && !this.tray.isDestroyed()) {
            this.currentToolTip = `${constants_1.TRAY_TOOLTIP} - Update v${version} available`;
            this.tray.setToolTip(this.currentToolTip);
            logger.log('Tray tooltip updated for version:', version);
        }
    }
    /**
     * Clear the update tooltip and restore default.
     */
    clearUpdateTooltip() {
        if (this.tray && !this.tray.isDestroyed()) {
            this.currentToolTip = constants_1.TRAY_TOOLTIP;
            this.tray.setToolTip(this.currentToolTip);
            logger.log('Tray tooltip reset to default');
        }
    }
    normalizeMacTrayImage(image) {
        const size = image.getSize();
        const normalized = size.width > 32 || size.height > 32 ? image.resize({ width: 16, height: 16 }) : image;
        normalized.setTemplateImage(true);
        return normalized;
    }
}
exports.default = TrayManager;
