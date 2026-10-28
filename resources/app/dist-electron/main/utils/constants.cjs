"use strict";
/**
 * Application constants for the Electron main process.
 * Centralized configuration values used across electron modules.
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
exports.TRAY_TOOLTIP = exports.TRAY_MENU_ITEMS = exports.READY_TO_SHOW_FALLBACK_MS = exports.APP_NAME = exports.APP_ID = exports.isWayland = exports.isDev = exports.isLinux = exports.isWindows = exports.isMacOS = exports.DEV_SERVER_PORT = exports.DEV_SERVER_URL = exports.QUICK_CHAT_WINDOW_CONFIG = exports.QUICK_CHAT_HEIGHT = exports.QUICK_CHAT_WIDTH = exports.OPTIONS_WINDOW_CONFIG = exports.MAIN_WINDOW_CONFIG = exports.BASE_WINDOW_CONFIG = exports.AUTH_WINDOW_CONFIG = exports.IPC_CHANNELS = exports.isGeminiDomain = exports.findGeminiElement = exports.GeminiSelectors = exports.GEMINI_MICROPHONE_ERROR_TEXT = exports.GEMINI_ERROR_TOAST_SELECTORS = exports.GEMINI_MICROPHONE_BUTTON_SELECTORS = exports.GEMINI_SUBMIT_DELAY_MS = exports.GEMINI_EDITOR_BLANK_CLASS = exports.GEMINI_SUBMIT_BUTTON_SELECTORS = exports.GEMINI_EDITOR_SELECTORS = exports.GEMINI_DOMAIN = exports.GEMINI_RESPONSE_API_PATTERN = exports.AI_STUDIO_URL = exports.AI_STUDIO_DOMAIN = exports.GEMINI_APP_URL = exports.GOOGLE_GENAI_TERMS_URL = exports.GOOGLE_TOS_URL = exports.GITHUB_DISCLAIMER_URL = exports.GITHUB_LICENSE_URL = exports.GITHUB_ISSUES_URL = exports.GITHUB_REPO_URL = exports.GOOGLE_SIGNIN_URL = exports.GOOGLE_ACCOUNTS_URL = exports.OAUTH_DOMAINS = exports.INTERNAL_DOMAINS = void 0;
exports.getBaseWebPreferences = getBaseWebPreferences;
exports.isInternalDomain = isInternalDomain;
exports.isOAuthDomain = isOAuthDomain;
exports.getTitleBarStyle = getTitleBarStyle;
exports.getDevUrl = getDevUrl;
exports.getWaylandPlatformStatus = getWaylandPlatformStatus;
const electron = __importStar(require("electron"));
const waylandDetector_1 = require("./waylandDetector.cjs");
// Import app separately — some test mocks may not define it.
let app;
try {
    app = electron.app;
}
catch {
    app = undefined;
}
// =========================================================================
// Domain Configuration
// =========================================================================
/**
 * Domains that should open inside Electron windows.
 * These URLs open in new Electron windows instead of the system browser.
 */
exports.INTERNAL_DOMAINS = ['gemini.google.com'];
/**
 * OAuth domains that require special handling.
 * These are intercepted and opened in a BrowserWindow with shared session.
 */
exports.OAUTH_DOMAINS = ['accounts.google.com', 'accounts.youtube.com'];
// =========================================================================
// Window Configuration
// =========================================================================
function isSandboxEnabled() {
    return !process.argv.includes('--no-sandbox') && !app?.commandLine?.hasSwitch?.('no-sandbox');
}
function isWebSecurityEnabled() {
    return !process.argv.includes('--disable-web-security');
}
/**
 * Create base webPreferences for a window.
 * Evaluated lazily so sandboxInit.ts can set 'no-sandbox' before this is read.
 */
function getBaseWebPreferences() {
    return {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: isSandboxEnabled(),
        webSecurity: isWebSecurityEnabled(),
    };
}
/**
 * Default URL for Google sign-in.
 */
exports.GOOGLE_ACCOUNTS_URL = 'https://accounts.google.com';
/**
 * Full URL for Google sign-in page.
 */
exports.GOOGLE_SIGNIN_URL = `${exports.GOOGLE_ACCOUNTS_URL}/signin`;
// =========================================================================
// External URLs
// =========================================================================
/**
 * GitHub repository base URL.
 */
exports.GITHUB_REPO_URL = 'https://github.com/bwendell/gemini-desktop';
/**
 * GitHub issues URL for bug reports.
 */
exports.GITHUB_ISSUES_URL = `${exports.GITHUB_REPO_URL}/issues`;
/**
 * GitHub license file URL.
 */
exports.GITHUB_LICENSE_URL = `${exports.GITHUB_REPO_URL}/blob/main/LICENSE`;
/**
 * GitHub disclaimer file URL.
 */
exports.GITHUB_DISCLAIMER_URL = `${exports.GITHUB_REPO_URL}/blob/main/DISCLAIMER.md`;
/**
 * Google Terms of Service URL.
 */
exports.GOOGLE_TOS_URL = 'https://policies.google.com/terms';
/**
 * Google Generative AI Terms URL.
 */
exports.GOOGLE_GENAI_TERMS_URL = 'https://policies.google.com/terms/generative-ai';
/**
 * Main Gemini application URL.
 */
exports.GEMINI_APP_URL = 'https://gemini.google.com/app';
/**
 * AI Studio domain (for checking URL).
 */
exports.AI_STUDIO_DOMAIN = 'aistudio.google.com';
/**
 * AI Studio URL.
 */
exports.AI_STUDIO_URL = `https://${exports.AI_STUDIO_DOMAIN}`;
/**
 * URL pattern for detecting Gemini response completion.
 * Used in webRequest.onCompleted to detect when Gemini finishes generating a response.
 *
 * The StreamGenerate endpoint handles actual chat streaming responses.
 * This is more specific than matching all BardChatUi calls, which would also
 * match log, batchexecute, and other non-response API calls.
 *
 * @example "https://gemini.google.com/u/0/_/BardChatUi/data/StreamGenerate?..."
 */
exports.GEMINI_RESPONSE_API_PATTERN = '*://gemini.google.com/*StreamGenerate*';
// =========================================================================
// Gemini DOM Selectors
// =========================================================================
// NOTE: These are re-exported from geminiSelectors.ts for backwards compatibility.
// For new code, import directly from './geminiSelectors' for better organization.
// See geminiSelectors.ts for version tracking and selector documentation.
var geminiSelectors_1 = require("./geminiSelectors.cjs");
Object.defineProperty(exports, "GEMINI_DOMAIN", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_DOMAIN; } });
Object.defineProperty(exports, "GEMINI_EDITOR_SELECTORS", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_EDITOR_SELECTORS; } });
Object.defineProperty(exports, "GEMINI_SUBMIT_BUTTON_SELECTORS", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_SUBMIT_BUTTON_SELECTORS; } });
Object.defineProperty(exports, "GEMINI_EDITOR_BLANK_CLASS", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_EDITOR_BLANK_CLASS; } });
Object.defineProperty(exports, "GEMINI_SUBMIT_DELAY_MS", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_SUBMIT_DELAY_MS; } });
Object.defineProperty(exports, "GEMINI_MICROPHONE_BUTTON_SELECTORS", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_MICROPHONE_BUTTON_SELECTORS; } });
Object.defineProperty(exports, "GEMINI_ERROR_TOAST_SELECTORS", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_ERROR_TOAST_SELECTORS; } });
Object.defineProperty(exports, "GEMINI_MICROPHONE_ERROR_TEXT", { enumerable: true, get: function () { return geminiSelectors_1.GEMINI_MICROPHONE_ERROR_TEXT; } });
Object.defineProperty(exports, "GeminiSelectors", { enumerable: true, get: function () { return geminiSelectors_1.GeminiSelectors; } });
Object.defineProperty(exports, "findGeminiElement", { enumerable: true, get: function () { return geminiSelectors_1.findGeminiElement; } });
Object.defineProperty(exports, "isGeminiDomain", { enumerable: true, get: function () { return geminiSelectors_1.isGeminiDomain; } });
// IPC Channel Names
// =========================================================================
/**
 * IPC channel names used for main process <-> renderer communication.
 * Now imported from shared location for consistency across all processes.
 *
 * @deprecated Import directly from '@shared/constants' for new code.
 * This re-export is provided for backward compatibility.
 */
var ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
Object.defineProperty(exports, "IPC_CHANNELS", { enumerable: true, get: function () { return ipc_channels_1.IPC_CHANNELS; } });
/**
 * Configuration for the authentication window.
 */
exports.AUTH_WINDOW_CONFIG = {
    width: 500,
    height: 700,
    title: 'Sign in to Google',
    autoHideMenuBar: true,
    webPreferences: {
        ...getBaseWebPreferences(),
    },
};
// =========================================================================
// Domain Helpers
// =========================================================================
/**
 * Check if a hostname should be handled internally (in Electron) vs externally (system browser).
 *
 * @param hostname - The hostname to check
 * @returns True if the URL should open in Electron
 */
function isInternalDomain(hostname) {
    return exports.INTERNAL_DOMAINS.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
}
/**
 * Check if a hostname is a Google OAuth domain.
 * OAuth domains are opened in a dedicated BrowserWindow with shared session.
 *
 * @param hostname - The hostname to check
 * @returns True if the URL is an OAuth domain
 */
function isOAuthDomain(hostname) {
    return exports.OAUTH_DOMAINS.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
}
// =============================================================================
// Window Configuration Constants
// =============================================================================
/**
 * Get titleBarStyle based on platform.
 * macOS uses 'hidden' for custom titlebar, others use default frame.
 *
 * @returns 'hidden' on macOS, undefined on other platforms
 */
function getTitleBarStyle() {
    /* v8 ignore next */
    return process.platform === 'darwin' ? 'hidden' : undefined;
}
/**
 * Base configuration shared by all application windows.
 */
exports.BASE_WINDOW_CONFIG = {
    backgroundColor: '#1a1a1a',
    show: false, // Prevent flash, show on ready-to-show event
    webPreferences: getBaseWebPreferences(),
};
/**
 * Configuration for the main application window.
 */
exports.MAIN_WINDOW_CONFIG = {
    width: 1200,
    height: 800,
    minWidth: 350,
    minHeight: 600,
    // macOS requires frame: true when titleBarStyle is 'hidden'
    frame: process.platform === 'darwin',
    ...exports.BASE_WINDOW_CONFIG,
};
/**
 * Configuration for the options/settings window.
 */
exports.OPTIONS_WINDOW_CONFIG = {
    width: 600,
    height: 400,
    resizable: true,
    minimizable: true,
    maximizable: false,
    frame: false,
    ...exports.BASE_WINDOW_CONFIG,
    show: true, // Options window shows immediately
};
/**
 * Configuration for the Quick Chat floating window.
 * Spotlight-like appearance: frameless, transparent, always-on-top.
 */
exports.QUICK_CHAT_WIDTH = 600;
exports.QUICK_CHAT_HEIGHT = 80;
exports.QUICK_CHAT_WINDOW_CONFIG = {
    width: exports.QUICK_CHAT_WIDTH,
    height: exports.QUICK_CHAT_HEIGHT,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    ...exports.BASE_WINDOW_CONFIG,
    backgroundColor: undefined, // Override for transparency
    show: false, // Show when ready
};
// =============================================================================
// Development Server Configuration
// =============================================================================
/**
 * Development server base URL.
 */
exports.DEV_SERVER_URL = 'http://localhost:1420';
/**
 * Development server port.
 */
exports.DEV_SERVER_PORT = 1420;
/**
 * Get URL for a dev server page.
 *
 * @param page - Optional page path (e.g., 'options.html')
 * @returns Full dev server URL
 * @example
 * getDevUrl() // 'http://localhost:1420'
 * getDevUrl('options.html') // 'http://localhost:1420/options.html'
 */
function getDevUrl(page = '') {
    return page ? `${exports.DEV_SERVER_URL}/${page}` : exports.DEV_SERVER_URL;
}
// =============================================================================
// Platform Constants
// =============================================================================
exports.isMacOS = process.platform === 'darwin';
exports.isWindows = process.platform === 'win32';
exports.isLinux = process.platform === 'linux';
exports.isDev = process.env.NODE_ENV === 'development';
exports.isWayland = (process.env.XDG_SESSION_TYPE || '').toLowerCase() === 'wayland';
// Lazy-initialized Wayland status (computed once on first access)
let _waylandStatus = null;
function getWaylandPlatformStatus() {
    if (!_waylandStatus) {
        _waylandStatus = (0, waylandDetector_1.getWaylandStatus)();
    }
    return _waylandStatus;
}
/**
 * Application ID used for Windows notifications, taskbar grouping, and app identification.
 * Must match `appId` in `config/electron-builder.config.cjs` for consistency.
 */
exports.APP_ID = 'com.benwendell.gemini-desktop';
/**
 * Application display name used in notifications, dialogs, and UI.
 * Must match `productName` in `package.json` for consistency.
 */
exports.APP_NAME = 'Gemini Desktop';
/**
 * Fallback timeout (ms) if ready-to-show event doesn't fire.
 * Used in headless environments like CI where the event may not be reliable.
 */
exports.READY_TO_SHOW_FALLBACK_MS = 3000;
/**
 * Predefined tray menu items.
 * TrayManager iterates over these to build the context menu.
 */
exports.TRAY_MENU_ITEMS = {
    SHOW: { label: 'Show Gemini Desktop', id: 'show' },
    SEPARATOR: { label: '', id: 'separator', isSeparator: true },
    QUIT: { label: 'Quit', id: 'quit' },
};
/**
 * Tooltip for the tray icon.
 */
exports.TRAY_TOOLTIP = 'Gemini Desktop';
