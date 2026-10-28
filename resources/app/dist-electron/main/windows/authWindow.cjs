"use strict";
/**
 * Auth Window class for Google sign-in.
 *
 * Handles:
 * - OAuth window creation with shared session
 * - Navigation detection for successful sign-in
 * - Auto-close when navigation returns to Gemini
 * - Error handling for network/certificate issues
 *
 * @module AuthWindow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const baseWindow_1 = __importDefault(require("./baseWindow.cjs"));
const constants_1 = require("../utils/constants.cjs");
const paths_1 = require("../utils/paths.cjs");
const authSpoofing_1 = require("../utils/authSpoofing.cjs");
/**
 * Reject a promise if it does not settle within `ms` milliseconds.
 */
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
    ]);
}
/**
 * Authentication window for Google sign-in.
 * Uses shared session to persist cookies with main window.
 */
class AuthWindow extends baseWindow_1.default {
    windowConfig;
    htmlFile = ''; // Not used - loads URL instead
    /** Whether the auth header spoofing listener is registered */
    headerSpoofingRegistered = false;
    /** Stored webRequest listener for auth header spoofing */
    headerSpoofingListener;
    /** Whether CDP Network.setUserAgentOverride succeeded */
    cdpUserAgentApplied = false;
    /**
     * Creates a new AuthWindow instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev) {
        super(isDev, '[AuthWindow]');
        this.windowConfig = {
            ...constants_1.AUTH_WINDOW_CONFIG,
            icon: (0, paths_1.getIconPath)(),
            webPreferences: {
                ...constants_1.AUTH_WINDOW_CONFIG.webPreferences,
                preload: path.join(__dirname, '..', '..', 'preload', 'authPreload.cjs'),
            },
        };
    }
    /**
     * Create the auth window and load the OAuth URL.
     * @param url - The OAuth URL to load
     * @returns The created BrowserWindow
     */
    create(url) {
        this.logger.log('Creating auth window for:', url);
        // Close any existing auth window before creating a new one
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
        }
        const authWindow = this.createWindow();
        this.setupAuthHandlers(authWindow);
        // Google rejects embedded browsers ("This browser or app may not be
        // secure"). Spoof Chrome UA/client hints at the network level; the
        // preload script stubs navigator.webdriver/window.chrome.
        this.applyChromeSpoofing(authWindow);
        // onBeforeSendHeaders cannot reliably override Sec-CH-UA (Chromium
        // re-adds its own value), so also set the UA/client hints via CDP.
        this.applyCdpUserAgentOverride(authWindow)
            .catch((error) => {
                this.logger.warn('CDP user-agent override failed:', error);
            })
            .finally(() => {
                authWindow.loadURL(url).catch((error) => {
                    this.logger.error('Failed to load auth URL:', {
                        url,
                        error: error.message,
                    });
                });
            });
        return authWindow;
    }
    /**
     * Make the auth window look like a regular Google Chrome browser.
     *
     * Google's sign-in flow rejects Electron/embedded browsers with
     * "This browser or app may not be secure". We override the User-Agent and
     * the Sec-CH-UA* client hint headers for accounts.google.com requests.
     * The navigator.webdriver/window.chrome stubs are injected by the preload
     * script (see preload.cjs).
     */
    applyChromeSpoofing(authWindow) {
        const chromeVersion = process.versions.chrome || '142.0.7444.265';
        const majorVersion = chromeVersion.split('.')[0] || '142';
        // Pretend to be Microsoft Edge, like gfn-electron does. Edge is a
        // supported browser for Google sign-in, and its client hints are
        // consistent with the Edg/ UA token. The shared helpers keep the UA
        // and client hints platform-consistent on macOS/Windows/Linux.
        const userAgent = (0, authSpoofing_1.getAuthUserAgent)();
        const platform = (0, authSpoofing_1.getAuthPlatform)();
        const platformVersion = (0, authSpoofing_1.getAuthPlatformVersion)();
        try {
            authWindow.webContents.setUserAgent(userAgent);
        }
        catch (error) {
            this.logger.warn('Failed to set auth window User-Agent:', error);
        }
        if (this.headerSpoofingRegistered) {
            return;
        }
        this.headerSpoofingRegistered = true;
        const filter = {
            urls: ['*://accounts.google.com/*', '*://ogs.google.com/*'],
        };
        this.headerSpoofingListener = (details, callback) => {
            // If CDP already set the UA/client hints, do not touch the headers:
            // otherwise Chromium sends duplicate Sec-CH-UA headers.
            if (this.cdpUserAgentApplied) {
                callback({});
                return;
            }
            // Fallback: drop the original UA/client-hint headers and set ours.
            const headers = {};
            for (const [key, value] of Object.entries(details.requestHeaders)) {
                const lower = key.toLowerCase();
                if (lower === 'user-agent' || lower === 'accept-language' || lower.startsWith('sec-ch-ua')) {
                    continue;
                }
                headers[lower] = value;
            }
            headers['user-agent'] = userAgent;
            headers['sec-ch-ua'] = `"Microsoft Edge";v="${majorVersion}", "Chromium";v="${majorVersion}", "Not_A Brand";v="99"`;
            headers['sec-ch-ua-mobile'] = '?0';
            headers['sec-ch-ua-platform'] = `"${platform}"`;
            headers['sec-ch-ua-platform-version'] = `"${platformVersion}"`;
            headers['sec-ch-ua-arch'] = '"x86"';
            headers['sec-ch-ua-bitness'] = '"64"';
            headers['sec-ch-ua-full-version-list'] = `"Microsoft Edge";v="${chromeVersion}", "Chromium";v="${chromeVersion}", "Not_A Brand";v="99.0.0.0"`;
            headers['sec-ch-ua-full-version'] = `"${chromeVersion}"`;
            headers['sec-ch-ua-model'] = '""';
            headers['sec-ch-ua-wow64'] = '?0';
            headers['sec-ch-ua-form-factors'] = '"Desktop"';
            callback({ requestHeaders: headers });
        };
        try {
            electron_1.session.defaultSession.webRequest.onBeforeSendHeaders(filter, this.headerSpoofingListener);
            this.logger.log('Auth header spoofing registered', {
                chromeVersion,
                platform,
            });
        }
        catch (error) {
            this.logger.warn('Failed to register auth header spoofing:', error);
        }
    }
    /**
     * Set the User-Agent and client hints via CDP.
     *
     * `webRequest.onBeforeSendHeaders` is not enough for Sec-CH-UA: Chromium
     * re-adds its own value after the listener. `Network.setUserAgentOverride`
     * changes the value at the network stack level, so every request carries
     * the Chrome-like client hints.
     */
    async applyCdpUserAgentOverride(authWindow) {
        const chromeVersion = process.versions.chrome || '142.0.7444.265';
        const majorVersion = chromeVersion.split('.')[0] || '142';
        const userAgent = (0, authSpoofing_1.getAuthUserAgent)();
        const platform = (0, authSpoofing_1.getAuthPlatform)();
        const platformVersion = (0, authSpoofing_1.getAuthPlatformVersion)();
        try {
            const debuggerApi = authWindow.webContents.debugger;
            if (!debuggerApi.isAttached()) {
                debuggerApi.attach('1.3');
            }
            await withTimeout(debuggerApi.sendCommand('Network.setUserAgentOverride', {
                userAgent,
                acceptLanguage: 'en-US,en',
                platform: process.platform === 'darwin'
                    ? 'MacIntel'
                    : process.platform === 'win32'
                        ? 'Win32'
                        : 'Linux x86_64',
                userAgentMetadata: {
                    brands: [
                        { brand: 'Microsoft Edge', version: majorVersion },
                        { brand: 'Chromium', version: majorVersion },
                        { brand: 'Not_A Brand', version: '99' },
                    ],
                    fullVersionList: [
                        { brand: 'Microsoft Edge', version: chromeVersion },
                        { brand: 'Chromium', version: chromeVersion },
                        { brand: 'Not_A Brand', version: '99.0.0.0' },
                    ],
                    fullVersion: chromeVersion,
                    platform,
                    platformVersion,
                    architecture: 'x86',
                    model: '',
                    mobile: false,
                    bitness: '64',
                    wow64: false,
                },
            }), 2000, 'Network.setUserAgentOverride');
            this.cdpUserAgentApplied = true;
            this.logger.log('CDP Network.setUserAgentOverride applied');
        }
        catch (error) {
            this.logger.warn('CDP Network.setUserAgentOverride failed:', error);
        }
    }
    /**
     * Override loadContent to do nothing as AuthWindow loads external URLs.
     */
    loadContent() {
        // No-op: AuthWindow uses loadURL with dynamic URLs in create()
    }
    /**
     * Set up all event handlers for the auth window.
     */
    setupAuthHandlers(authWindow) {
        // Handle page load failures (network errors, DNS failures, etc.)
        authWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            this.logger.error('Auth window failed to load:', {
                errorCode,
                errorDescription,
                url: validatedURL,
            });
            // Don't auto-close on load failure - let user see the error or retry
        });
        // Handle certificate errors (expired certs, self-signed, etc.)
        authWindow.webContents.on('certificate-error', (_event, _url, _error, _certificate, callback) => {
            // In production, we should NOT bypass certificate errors for security
            this.logger.warn('Certificate error in auth window - connection denied for security');
            callback(false);
        });
        // Auto-close when user successfully signs in and navigates to Gemini
        authWindow.webContents.on('did-navigate', (_event, navigationUrl) => {
            // Guard: Check if window/webContents still exists
            if (authWindow.isDestroyed()) {
                this.logger.warn('Auth window navigated but window was already destroyed');
                return;
            }
            try {
                const urlObj = new URL(navigationUrl);
                const hostname = urlObj.hostname;
                // Log navigation for debugging OAuth flows
                this.logger.log('Auth window navigated to:', hostname);
                if ((0, constants_1.isInternalDomain)(hostname)) {
                    this.logger.log('Login successful, closing auth window');
                    // Notify the main window so it can reload the Gemini iframe
                    // and pick up the new session cookies.
                    this.emit('authenticated', navigationUrl);
                    // Guard: Double-check before closing
                    if (!authWindow.isDestroyed()) {
                        authWindow.close();
                    }
                }
            }
            catch (e) {
                // Invalid URL - log but don't crash
                this.logger.error('Invalid URL in auth navigation:', {
                    url: navigationUrl,
                    error: e.message,
                });
            }
        });
        // Handle in-page navigation (hash changes, etc.)
        authWindow.webContents.on('did-navigate-in-page', (_event, navigationUrl) => {
            if (!authWindow.isDestroyed()) {
                this.logger.log('Auth window in-page navigation:', navigationUrl);
            }
        });
        // Log when window is closed and clear reference
        authWindow.on('closed', () => {
            this.logger.log('Auth window closed');
            this.window = null;
            this.emit('closed');
        });
        // Handle unresponsive renderer
        authWindow.on('unresponsive', () => {
            this.logger.warn('Auth window became unresponsive');
        });
        authWindow.on('responsive', () => {
            this.logger.log('Auth window became responsive again');
        });
    }
}
exports.default = AuthWindow;
