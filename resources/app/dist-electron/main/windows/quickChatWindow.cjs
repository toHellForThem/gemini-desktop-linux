"use strict";
/**
 * Quick Chat Window class for the floating prompt.
 *
 * Handles:
 * - Spotlight-like floating window
 * - Positioning based on cursor/display
 * - Blur-to-hide behavior
 * - Toggle visibility
 *
 * @module QuickChatWindow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const baseWindow_1 = __importDefault(require("./baseWindow.cjs"));
const constants_1 = require("../utils/constants.cjs");
const paths_1 = require("../utils/paths.cjs");
/**
 * Quick Chat floating window.
 * Spotlight-like appearance: frameless, transparent, always-on-top.
 */
class QuickChatWindow extends baseWindow_1.default {
    windowConfig;
    htmlFile = 'src/renderer/windows/quickchat/quickchat.html';
    /**
     * Creates a new QuickChatWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev) {
        super(isDev, '[QuickChatWindow]');
        this.windowConfig = constants_1.QUICK_CHAT_WINDOW_CONFIG;
    }
    _isReady = false;
    _suppressBlurUntil = 0;
    _readyToShowFallbackTimeout = null;
    /**
     * Create the Quick Chat window.
     * @returns The created BrowserWindow
     */
    create() {
        if (this.window) {
            return this.window;
        }
        const { x, y } = this.calculatePosition();
        this.window = new electron_1.BrowserWindow({
            ...this.windowConfig,
            x,
            y,
            webPreferences: {
                ...this.windowConfig.webPreferences,
                preload: (0, paths_1.getPreloadPath)(),
            },
        });
        // Track when window is actually ready
        this.window.webContents.once('did-finish-load', () => {
            this._isReady = true;
            this.emit('quick-chat-ready');
        });
        // Use parent class content loading
        this.loadContent();
        this.window.once('ready-to-show', () => {
            this.showWindow();
        });
        this._readyToShowFallbackTimeout = setTimeout(() => {
            this._readyToShowFallbackTimeout = null;
            if (this.window && !this.window.isDestroyed() && !this.window.isVisible()) {
                this.logger.warn('ready-to-show timeout - showing Quick Chat window via fallback');
                this.showWindow();
            }
        }, 1000);
        // Auto-hide when window loses focus (Spotlight behavior)
        this.window.on('blur', () => {
            this.handleBlur();
        });
        this.window.on('hide', () => {
            this.clearReadyToShowFallbackTimeout();
        });
        this.window.on('closed', () => {
            this.clearReadyToShowFallbackTimeout();
            this.window = null;
            this._isReady = false;
            this.emit('closed');
        });
        this.logger.log('Quick Chat window created');
        return this.window;
    }
    /**
     * Show and focus the Quick Chat window.
     * Creates the window if it doesn't exist.
     */
    showAndFocus() {
        if (!this.window) {
            this.create();
        }
        else {
            // Reposition to current cursor display
            const { x, y } = this.calculatePosition();
            if (this.window && !this.window.isDestroyed()) {
                this.window.setPosition(x, y);
                this.showWindow();
            }
        }
    }
    showWindow() {
        if (!this.window || this.window.isDestroyed()) {
            return;
        }
        this._suppressBlurUntil = Date.now() + 500;
        this.window.show();
        this.window.focus();
    }
    handleBlur() {
        if (!this.window || this.window.isDestroyed() || !this.window.isVisible()) {
            return;
        }
        if (Date.now() < this._suppressBlurUntil) {
            return;
        }
        this.hide();
    }
    handleMainWindowFocus() {
        this.handleBlur();
    }
    /**
     * Toggle Quick Chat window visibility.
     */
    toggle() {
        if (this.window && this.window.isVisible()) {
            this.hide();
        }
        else {
            this.showAndFocus();
        }
    }
    /**
     * Hide the Quick Chat window with logging.
     */
    hide() {
        this.clearReadyToShowFallbackTimeout();
        if (this.window && !this.window.isDestroyed()) {
            this.window.hide();
            this.logger.log('Quick Chat window hidden');
        }
    }
    clearReadyToShowFallbackTimeout() {
        if (this._readyToShowFallbackTimeout) {
            clearTimeout(this._readyToShowFallbackTimeout);
            this._readyToShowFallbackTimeout = null;
        }
    }
    /**
     * Calculate position for Quick Chat window based on cursor location.
     * Centers horizontally on the active display, upper third vertically.
     */
    calculatePosition() {
        const cursorPoint = electron_1.screen.getCursorScreenPoint();
        const display = electron_1.screen.getDisplayNearestPoint(cursorPoint);
        const { width: displayWidth, height: displayHeight } = display.workAreaSize;
        const { x: displayX, y: displayY } = display.workArea;
        /* v8 ignore next -- fallback for undefined constant, always defined */
        const windowWidth = this.windowConfig.width ?? constants_1.QUICK_CHAT_WIDTH;
        const x = displayX + Math.round((displayWidth - windowWidth) / 2);
        const y = displayY + Math.round(displayHeight / 4);
        return { x, y };
    }
    /**
     * Check if window content is fully loaded.
     */
    isReady() {
        return this._isReady;
    }
}
exports.default = QuickChatWindow;
