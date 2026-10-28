"use strict";
/**
 * Base Window class for Electron windows.
 * Provides common functionality for all window types.
 *
 * @module BaseWindow
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const events_1 = require("events");
const logger_1 = require("../utils/logger.cjs");
const paths_1 = require("../utils/paths.cjs");
const constants_1 = require("../utils/constants.cjs");
/**
 * Abstract base class for application windows.
 * Encapsulates common BrowserWindow management patterns.
 *
 * @abstract
 */
class BaseWindow extends events_1.EventEmitter {
    /** The underlying BrowserWindow instance */
    window = null;
    /** Whether running in development mode */
    isDev;
    /** Logger instance for this window */
    logger;
    /**
     * Creates a new BaseWindow instance.
     * @param isDev - Whether running in development mode
     * @param loggerPrefix - Prefix for log messages
     */
    constructor(isDev, loggerPrefix) {
        super();
        this.isDev = isDev;
        this.logger = (0, logger_1.createLogger)(loggerPrefix);
    }
    /**
     * Get the underlying BrowserWindow instance.
     * @returns The BrowserWindow or null if not created
     */
    getWindow() {
        return this.window;
    }
    /**
     * Check if the window exists and is not destroyed.
     * @returns True if window is valid
     */
    isValid() {
        return this.window !== null && !this.window.isDestroyed();
    }
    /**
     * Create and show the window.
     * Subclasses should call this and then set up additional handlers.
     * @returns The created BrowserWindow
     */
    createWindow() {
        this.logger.debug('BaseWindow.createWindow() called');
        if (this.window && !this.window.isDestroyed()) {
            this.logger.debug('Window already exists, focusing');
            this.window.focus();
            return this.window;
        }
        try {
            this.logger.debug('Creating new BrowserWindow...');
            this.logger.log(`Creating window with props: partition=${this.windowConfig.webPreferences?.partition}`);
            this.window = new electron_1.BrowserWindow({
                ...this.windowConfig,
                webPreferences: {
                    ...this.windowConfig.webPreferences,
                    preload: this.windowConfig.webPreferences?.preload ?? (0, paths_1.getPreloadPath)(),
                },
            });
            this.logger.debug('BrowserWindow created successfully');
            this.logger.debug('About to call loadContent()');
            this.loadContent();
            this.logger.debug('loadContent() completed');
            this.logger.debug('About to call setupBaseHandlers()');
            this.setupBaseHandlers();
            this.logger.debug('setupBaseHandlers() completed');
            return this.window;
        }
        catch (error) {
            this.logger.error('Failed to create window:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });
            // Re-throw so the caller (WindowManager) can handle gracefully
            throw error;
        }
    }
    /**
     * Load the appropriate content based on dev/prod mode.
     */
    loadContent() {
        if (!this.window)
            return;
        if (this.isDev) {
            this.window.loadURL((0, constants_1.getDevUrl)(this.htmlFile));
        }
        else {
            this.window.loadFile((0, paths_1.getDistHtmlPath)(this.htmlFile));
        }
    }
    /**
     * Set up base event handlers common to all windows.
     */
    setupBaseHandlers() {
        if (!this.window)
            return;
        this.window.on('closed', () => {
            this.logger.log('Window closed');
            this.window = null;
            this.emit('closed');
            // Clean up EventEmitter listeners to prevent memory leaks
            this.removeAllListeners();
        });
    }
    /**
     * Close the window if it exists.
     */
    close() {
        if (this.isValid()) {
            this.window?.close();
        }
    }
    /**
     * Show the window.
     */
    show() {
        if (this.isValid()) {
            this.window?.show();
        }
    }
    /**
     * Hide the window.
     */
    hide() {
        if (this.isValid()) {
            this.window?.hide();
        }
    }
    /**
     * Focus the window.
     */
    focus() {
        if (this.isValid()) {
            this.window?.focus();
        }
    }
}
exports.default = BaseWindow;
