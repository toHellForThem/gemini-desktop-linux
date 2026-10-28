"use strict";
/**
 * Options Window class for settings/about dialogs.
 *
 * Handles:
 * - Options window creation with custom titlebar
 * - Tab navigation via hash fragments
 * - Single instance enforcement
 *
 * @module OptionsWindow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baseWindow_1 = __importDefault(require("./baseWindow.cjs"));
const constants_1 = require("../utils/constants.cjs");
const paths_1 = require("../utils/paths.cjs");
/**
 * Options/Settings window.
 * Handles the settings and about dialogs.
 */
class OptionsWindow extends baseWindow_1.default {
    windowConfig;
    htmlFile = 'src/renderer/windows/options/options.html';
    /** Pending tab to open upon window creation */
    pendingTab = null;
    /**
     * Creates a new OptionsWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev) {
        super(isDev, '[OptionsWindow]');
        this.windowConfig = {
            ...constants_1.OPTIONS_WINDOW_CONFIG,
            titleBarStyle: (0, constants_1.getTitleBarStyle)(),
        };
    }
    /**
     * Create or focus the options window.
     * @param tab - Optional tab to open ('settings' or 'about')
     * @returns The options window
     */
    create(tab) {
        this.pendingTab = tab;
        const hash = tab ? `#${tab}` : '';
        if (this.window && !this.window.isDestroyed()) {
            // If window exists, navigate to the requested tab
            if (tab) {
                const currentUrl = this.window.webContents.getURL();
                const baseUrl = currentUrl.split('#')[0];
                this.window.loadURL(`${baseUrl}${hash}`);
            }
            this.window.focus();
            return this.window;
        }
        // Store tab for loadContent
        if (tab) {
            this.pendingTab = tab;
        }
        const win = this.createWindow();
        // Reset pending tab
        this.pendingTab = null;
        win.once('ready-to-show', () => {
            win.show();
        });
        return win;
    }
    /**
     * Override loadContent to handle optional hash for tabs.
     */
    loadContent() {
        if (!this.window)
            return;
        const hash = this.pendingTab || undefined;
        if (this.isDev) {
            const devUrl = (0, constants_1.getDevUrl)(this.htmlFile);
            const urlWithHash = hash ? `${devUrl}#${hash}` : devUrl;
            this.window.loadURL(urlWithHash);
        }
        else {
            this.window.loadFile((0, paths_1.getDistHtmlPath)(this.htmlFile), { hash });
        }
    }
}
exports.default = OptionsWindow;
