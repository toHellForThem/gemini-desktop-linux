"use strict";
/**
 * Main Window class for the primary application window.
 *
 * Handles:
 * - Main window creation with custom titlebar
 * - Close-to-tray behavior
 * - Navigation security (blocking external URLs)
 * - Window open handler (OAuth interception, external links)
 *
 * @module MainWindow
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const baseWindow_1 = __importDefault(require("./baseWindow.cjs"));
const constants_1 = require("../utils/constants.cjs");
const store_1 = __importDefault(require("../store.cjs"));
const paths_1 = require("../utils/paths.cjs");
const platformAdapterFactory_1 = require("../platform/platformAdapterFactory.cjs");
const authSpoofing_1 = require("../utils/authSpoofing.cjs");
/**
 * Main application window.
 * Extends BaseWindow with main window specific behavior.
 */
class MainWindow extends baseWindow_1.default {
    windowConfig;
    htmlFile = 'index.html';
    /** Whether the app is quitting (vs closing to tray) */
    isQuitting = false;
    /** Whether the main window is currently showing the Google sign-in page */
    isAuthMode = false;
    /** Callback to create auth window for OAuth flows */
    createAuthWindowCallback;
    /** Callback to close options window when closing main window */
    closeOptionsWindowCallback;
    /** Callback to close auth window when closing main window */
    closeAuthWindowCallback;
    /** Debounce cooldown in milliseconds for response-complete events */
    static RESPONSE_DEBOUNCE_MS = 1000;
    /** Timestamp of the last response-complete event (for debouncing) */
    lastResponseCompleteTime = 0;
    /** Timestamp of the last fullscreen toggle (to prevent double F11 triggers) */
    lastFullscreenToggleTime = 0;
    /** Stored webRequest listener for cleanup (Task 12.8) */
    responseDetectionListener;
    /** Stored webRequest filter for cleanup */
    responseDetectionFilter;
    /** Stored webRequest listener for Google sign-in interception */
    authRedirectListener;
    /** Stored webRequest filter for Google sign-in interception */
    authRedirectFilter;
    /** Debounce timestamp for auth interception */
    lastAuthInterceptAt = 0;
    /** Platform adapter for platform-specific window behavior */
    adapter;
    /**
     * Creates a new MainWindow instance.
     * @param isDev - Whether running in development mode
     * @param adapter - Optional platform adapter (defaults to getPlatformAdapter())
     */
    constructor(isDev, adapter) {
        super(isDev, '[MainWindow]');
        this.adapter = adapter ?? (0, platformAdapterFactory_1.getPlatformAdapter)();
        const platformConfig = this.adapter.getMainWindowPlatformConfig();
        this.windowConfig = {
            ...constants_1.MAIN_WINDOW_CONFIG,
            title: 'Gemini Desktop',
            ...(platformConfig.wmClass ? { wmClass: platformConfig.wmClass } : {}),
            titleBarStyle: (0, constants_1.getTitleBarStyle)(),
            icon: (0, paths_1.getIconPath)(),
        };
    }
    /**
     * Set callback for creating auth windows (OAuth flow).
     * @param callback - Function to create auth window with URL
     */
    setAuthWindowCallback(callback) {
        this.createAuthWindowCallback = callback;
    }
    /**
     * Set callback for closing options window when main window closes.
     * @param callback - Function to close options window
     */
    setCloseOptionsCallback(callback) {
        this.closeOptionsWindowCallback = callback;
    }
    /**
     * Set callback for closing auth window when main window closes.
     * @param callback - Function to close auth window
     */
    setCloseAuthCallback(callback) {
        this.closeAuthWindowCallback = callback;
    }
    /**
     * Create the main window.
     * @param options - Optional creation options
     * @param options.startHidden - When true, skips initial show-on-ready behavior for hidden startup flows
     * @returns The created BrowserWindow
     */
    create(options) {
        this.logger.debug('MainWindow.create() called');
        const win = this.createWindow();
        this.logger.debug('createWindow() returned');
        if (this.isDev && this.window) {
            this.logger.debug('Opening dev tools');
            this.window.webContents.openDevTools();
        }
        if (!options?.startHidden) {
            this.window?.once('ready-to-show', () => {
                this.logger.debug('ready-to-show event fired, calling show()');
                this.window?.show();
            });
            setTimeout(() => {
                if (this.window && !this.window.isVisible()) {
                    this.logger.warn('ready-to-show timeout - showing window via fallback');
                    this.window.show();
                }
            }, constants_1.READY_TO_SHOW_FALLBACK_MS);
        }
        this.setupWindowOpenHandler();
        this.setupNavigationHandler();
        this.setupFrameNavigationHandler();
        this.setupCloseHandler();
        this.setupCrashHandlers();
        this.setupResponseDetection();
        this.setupTabShortcutForwarding();
        this.setupFrameLoadHandler();
        this.setupFullscreenHandlers();
        return win;
    }
    /**
     * Set up crash and error handlers for the main window.
     * These prevent OS crash dialogs and handle errors gracefully.
     */
    setupCrashHandlers() {
        if (!this.window)
            return;
        // Handle renderer process crash
        this.window.webContents.on('render-process-gone', (_event, details) => {
            this.logger.error('Main window renderer process gone:', {
                reason: details.reason,
                exitCode: details.exitCode,
            });
            // If not killed intentionally, try to recover by reloading
            if (details.reason !== 'killed' && this.window && !this.window.isDestroyed()) {
                this.logger.log('Attempting to reload crashed main window renderer...');
                this.window.reload();
            }
        });
        // Handle page load failures (network errors, DNS failures, etc.)
        this.window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
            this.logger.error('Main window failed to load:', {
                errorCode,
                errorDescription,
                url: validatedURL,
            });
        });
        // Handle unresponsive renderer
        this.window.on('unresponsive', () => {
            this.logger.warn('Main window became unresponsive');
        });
        this.window.on('responsive', () => {
            this.logger.log('Main window became responsive again');
        });
    }
    /**
     * Override loadContent to use base dev URL for main window.
     * Main window loads from root, not /index.html.
     */
    loadContent() {
        if (!this.window)
            return;
        if (this.isDev) {
            // Main window uses base URL in dev mode
            this.window.loadURL((0, constants_1.getDevUrl)());
        }
        else {
            this.window.loadFile((0, paths_1.getDistHtmlPath)(this.htmlFile));
        }
    }
    /**
     * Set up navigation handler to prevent navigation hijacking.
     * Blocks attempts to navigate the main window to external URLs.
     */
    setupNavigationHandler() {
        if (!this.window)
            return;
        // When the main window is used for Google sign-in, restore the local
        // app UI as soon as Google redirects back to Gemini.
        this.window.webContents.on('did-navigate', (_event, url) => {
            if (!this.isAuthMode) {
                return;
            }
            try {
                const hostname = new URL(url).hostname;
                if ((0, constants_1.isInternalDomain)(hostname)) {
                    this.logger.log('Google sign-in completed in main window, restoring app UI');
                    this.isAuthMode = false;
                    this.loadContent();
                }
            }
            catch {
                // ignore invalid URL
            }
        });
        this.window.webContents.on('will-navigate', (event, url) => {
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                const protocol = urlObj.protocol;
                // Main-window auth: Google redirected back to Gemini.
                if (this.isAuthMode && (0, constants_1.isInternalDomain)(hostname)) {
                    this.logger.log('Google sign-in completed in main window, restoring app UI');
                    event.preventDefault();
                    this.isAuthMode = false;
                    this.loadContent();
                    return;
                }
                // Allow navigation to local application files (needed for reload)
                if (protocol === 'file:') {
                    this.logger.log('Allowing navigation to local file:', url);
                    return;
                }
                // Allow navigation to localhost (needed for dev mode reload/retry)
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    this.logger.log('Allowing navigation to localhost:', url);
                    return;
                }
                // Allow navigation to internal domains
                if ((0, constants_1.isInternalDomain)(hostname)) {
                    this.logger.log('Allowing navigation to internal URL:', url);
                    return;
                }
                // Allow navigation to OAuth domains (for sign-in flows)
                if ((0, constants_1.isOAuthDomain)(hostname)) {
                    this.logger.log('Allowing navigation to OAuth URL:', url);
                    return;
                }
                // Block navigation to external URLs
                this.logger.warn('Blocked navigation to external URL:', url);
                event.preventDefault();
            }
            catch {
                this.logger.error('Invalid navigation URL, blocking:', url);
                event.preventDefault();
            }
        });
    }
    /**
     * Intercept Google sign-in navigations that happen inside a subframe.
     *
     * Gemini is embedded in an iframe. When its session expires, the iframe
     * navigates to accounts.google.com/ServiceLogin. Google rejects sign-in
     * requests that originate from an iframe (`Sec-Fetch-Dest: iframe`) with
     * a 401 "malformed request" page, so we cancel the subframe navigation and
     * open the URL in a top-level AuthWindow instead.
     */
    setupFrameNavigationHandler() {
        if (!this.window)
            return;
        // Only real sign-in pages should be intercepted. Gemini also loads
        // hidden accounts.google.com iframes such as RotateCookiesPage,
        // _/bscframe and generate_204; navigating the main window to those
        // produces a blank/black window.
        const isGoogleSignInUrl = (url) => {
            try {
                const parsed = new URL(url);
                const hostname = parsed.hostname;
                const pathname = parsed.pathname;
                if (hostname === 'ogs.google.com' || hostname.endsWith('.ogs.google.com')) {
                    // Exclude the Google apps launcher widget; only the
                    // account-chooser/sign-in pages should be intercepted.
                    return !pathname.includes('/widget/');
                }
                if (!(hostname === 'accounts.google.com' || hostname.endsWith('.accounts.google.com'))) {
                    return false;
                }
                return pathname.startsWith('/ServiceLogin') ||
                    pathname.startsWith('/v3/signin') ||
                    pathname.startsWith('/signin') ||
                    pathname.startsWith('/o/oauth2') ||
                    pathname.startsWith('/CheckCookie');
            }
            catch {
                return false;
            }
        };
        const interceptAuthUrl = (url, source) => {
            const now = Date.now();
            if (now - this.lastAuthInterceptAt < 1000) {
                this.logger.log('Skipping duplicate auth interception', { source, url });
                return;
            }
            this.lastAuthInterceptAt = now;
            this.logger.log(`Intercepting subframe Google sign-in (${source}):`, url);
            // Use the main window for sign-in: it is a top-level navigation,
            // so Google accepts it, and the shared session keeps the cookies.
            this.startMainWindowAuth(url);
        };
        // Primary handler: fires for renderer-initiated subframe navigations.
        this.window.webContents.on('will-frame-navigate', (event, url, isMainFrame) => {
            if (isMainFrame)
                return;
            // While the main window is showing the Google sign-in page, let
            // that page navigate its own subframes (bscframe, identifier, etc.).
            if (this.isAuthMode)
                return;
            try {
                if (!isGoogleSignInUrl(url))
                    return;
                event.preventDefault();
                interceptAuthUrl(url, 'will-frame-navigate');
            }
            catch (error) {
                this.logger.error('Invalid subframe navigation URL:', {
                    url,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        });
        // Fallback: server-side 302 redirects (gemini.google.com/signin ->
        // accounts.google.com/ServiceLogin) do not always emit
        // will-frame-navigate, so catch the resulting subframe request here.
        this.authRedirectFilter = {
            urls: ['*://accounts.google.com/*', '*://ogs.google.com/*'],
        };
        this.authRedirectListener = (details, callback) => {
            try {
                // While the main window is showing the Google sign-in page, do
                // not cancel its subframe requests.
                if (this.isAuthMode) {
                    callback({});
                    return;
                }
                if (details.resourceType !== 'subFrame') {
                    callback({});
                    return;
                }
                if (this.window && details.webContentsId !== this.window.webContents.id) {
                    callback({});
                    return;
                }
                if (!isGoogleSignInUrl(details.url)) {
                    callback({});
                    return;
                }
                callback({ cancel: true });
                interceptAuthUrl(details.url, 'webRequest.onBeforeRequest');
            }
            catch (error) {
                this.logger.error('Error intercepting Google sign-in request:', error);
                callback({});
            }
        };
        electron_1.session.defaultSession.webRequest.onBeforeRequest(this.authRedirectFilter, this.authRedirectListener);
    }
    /**
     * Navigate the main window to the Google sign-in page.
     *
     * This is a top-level navigation, so Google does not reject it as an
     * embedded iframe. After Google redirects back to Gemini, the
     * `did-navigate`/`will-navigate` handlers restore the local app UI.
     */
    startMainWindowAuth(url) {
        if (!this.window || this.window.isDestroyed()) {
            return;
        }
        if (this.isAuthMode) {
            this.logger.log('Main-window auth already in progress, ignoring:', url);
            return;
        }
        this.isAuthMode = true;
        // The main window uses the app preload, so register the shared
        // Edge-like header spoofing before navigating to Google.
        (0, authSpoofing_1.registerAuthHeaderSpoofing)();
        this.logger.log('Starting Google sign-in in main window:', url);
        this.window.loadURL(url).catch((error) => {
            this.logger.error('Failed to load Google sign-in in main window:', {
                url,
                error: error.message,
            });
            this.isAuthMode = false;
        });
    }
    /**
     * Reload Gemini tab frames after a successful sign-in so they pick up the
     * new session cookies.
     */
    reloadGeminiFrames() {
        if (!this.window || this.window.isDestroyed())
            return;
        const frames = this.window.webContents.mainFrame.frames;
        let reloaded = 0;
        for (const frame of frames) {
            if (frame.isDestroyed())
                continue;
            const frameName = frame.name || '';
            const isTabFrame = frameName.startsWith('gemini-tab-');
            const isGeminiFrame = (0, constants_1.isGeminiDomain)(frame.url);
            if (!isTabFrame && !isGeminiFrame)
                continue;
            try {
                frame.reload();
                reloaded += 1;
            }
            catch (error) {
                this.logger.error('Failed to reload Gemini frame:', {
                    frameName,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        if (reloaded === 0) {
            this.logger.log('No Gemini frames found, reloading main window');
            this.window.webContents.reload();
            return;
        }
        this.logger.log('Reloaded Gemini frames after sign-in', { reloaded });
    }
    /**
     * Set up handler for window.open() calls from the renderer.
     * Routes URLs to appropriate destinations (auth window, internal, or external).
     */
    setupWindowOpenHandler() {
        if (!this.window)
            return;
        this.window.webContents.setWindowOpenHandler(({ url }) => {
            let hostname;
            try {
                const urlObj = new URL(url);
                hostname = urlObj.hostname;
            }
            catch (error) {
                this.logger.error('Invalid URL in window open handler:', { url, error });
                return { action: 'deny' };
            }
            try {
                // OAuth domains: open in dedicated auth window
                if ((0, constants_1.isOAuthDomain)(hostname)) {
                    this.logger.log('Intercepting OAuth popup:', url);
                    if (this.createAuthWindowCallback) {
                        this.createAuthWindowCallback(url);
                    }
                    else {
                        this.logger.error('Auth window callback not set');
                    }
                    return { action: 'deny' };
                }
                // Internal domains: allow in new Electron window
                if ((0, constants_1.isInternalDomain)(hostname)) {
                    return { action: 'allow' };
                }
            }
            catch (error) {
                this.logger.error('Error handling window open:', error);
                return { action: 'deny' };
            }
            // External links: open in system browser
            if (url.startsWith('http:') || url.startsWith('https:')) {
                electron_1.shell.openExternal(url);
            }
            return { action: 'deny' };
        });
    }
    /**
     * Set up close handler for close-to-tray behavior.
     */
    setupCloseHandler() {
        if (!this.window)
            return;
        this.window.on('closed', () => {
            // Close auxiliary windows if they exist
            this.closeOptionsWindowCallback?.();
            this.closeAuthWindowCallback?.();
            // Task 12.8: Clean up webRequest listener to prevent memory leaks
            if (this.responseDetectionListener && this.responseDetectionFilter) {
                try {
                    // Properly clear the session listener by calling onCompleted with null
                    electron_1.session.defaultSession.webRequest.onCompleted(this.responseDetectionFilter, null);
                    this.responseDetectionListener = undefined;
                    this.responseDetectionFilter = undefined;
                    this.logger.log('Response detection listener cleaned up');
                }
                catch (error) {
                    this.logger.error('Failed to clean up response detection:', error);
                }
            }
            if (this.authRedirectListener && this.authRedirectFilter) {
                try {
                    electron_1.session.defaultSession.webRequest.onBeforeRequest(this.authRedirectFilter, null);
                    this.authRedirectListener = undefined;
                    this.authRedirectFilter = undefined;
                    this.logger.log('Auth redirect listener cleaned up');
                }
                catch (error) {
                    this.logger.error('Failed to clean up auth redirect listener:', error);
                }
            }
            this.window = null;
        });
        // Close to tray behavior
        this.window.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.hideToTray();
            }
        });
    }
    /**
     * Hide the main window to tray.
     */
    hideToTray() {
        try {
            if (!this.window) {
                this.logger.warn('Cannot hide to tray: no main window');
                return;
            }
            // Close auxiliary windows when hiding main window
            this.closeOptionsWindowCallback?.();
            this.closeAuthWindowCallback?.();
            this.adapter.hideToTray(this.window);
            this.logger.log('Main window hidden to tray');
        }
        catch (error) {
            this.logger.error('Failed to hide window to tray:', error);
        }
    }
    /**
     * Restore the main window from tray.
     */
    restoreFromTray() {
        try {
            if (!this.window) {
                this.logger.warn('Cannot restore from tray: no main window');
                return;
            }
            this.adapter.restoreFromTray(this.window);
            this.logger.log('Main window restored from tray');
        }
        catch (error) {
            this.logger.error('Failed to restore window from tray:', error);
        }
    }
    /**
     * Set the quitting state.
     * @param state - Whether the app is quitting
     */
    setQuitting(state) {
        this.isQuitting = state;
    }
    /**
     * Minimize the main window.
     */
    minimize() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.minimize();
        }
    }
    /**
     * Set the always-on-top state for the main window.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop(enabled) {
        if (this.window && !this.window.isDestroyed()) {
            this.window.setAlwaysOnTop(enabled);
            this.emit('always-on-top-changed', enabled);
            this.logger.log(`Always on top ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
    /**
     * Get the current always-on-top state.
     * @returns True if always-on-top is enabled
     */
    isAlwaysOnTop() {
        return this.window?.isAlwaysOnTop() ?? false;
    }
    /** Delay in milliseconds before enabling response detection after page load */
    static RESPONSE_DETECTION_STARTUP_DELAY_MS = 10000;
    /** Whether response detection is active (disabled during startup) */
    responseDetectionActive = false;
    /**
     * Set up response detection to monitor when Gemini finishes generating a response.
     * Uses network request monitoring to detect streaming completion.
     * Emits 'response-complete' event with debouncing to prevent rapid-fire notifications.
     *
     * Note: Detection is delayed until after page load + startup delay to avoid
     * false positives from initial page load network requests.
     */
    setupResponseDetection() {
        if (!this.window)
            return;
        // Wait for page to finish loading before enabling response detection
        // This prevents false positives from initial page load network requests
        this.window.webContents.once('did-finish-load', () => {
            this.logger.log(`Response detection will activate in ${MainWindow.RESPONSE_DETECTION_STARTUP_DELAY_MS / 1000}s`);
            setTimeout(() => {
                this.responseDetectionActive = true;
                this.logger.log('Response detection now active');
            }, MainWindow.RESPONSE_DETECTION_STARTUP_DELAY_MS);
        });
        // Monitor Gemini's streaming API endpoints for response completion
        // The BardChatUi endpoint handles chat streaming responses
        const geminiApiFilter = {
            urls: [constants_1.GEMINI_RESPONSE_API_PATTERN],
        };
        // Store filter for cleanup (Task 12.8)
        this.responseDetectionFilter = geminiApiFilter;
        // Task 12.8: Store listener reference for potential cleanup
        // Task 12.9: Wrap registration in try/catch for robustness
        try {
            this.responseDetectionListener = (details) => {
                // Skip if response detection is not yet active (during startup)
                if (!this.responseDetectionActive) {
                    return;
                }
                // Only process successful streaming response completions
                if (details.statusCode !== 200) {
                    return;
                }
                // Apply debouncing to prevent rapid notifications
                const now = Date.now();
                if (now - this.lastResponseCompleteTime < MainWindow.RESPONSE_DEBOUNCE_MS) {
                    // Only log in dev/CI mode to avoid main thread overhead in production
                    if (this.isDev || process.env.CI) {
                        this.logger.debug('Response-complete debounced');
                    }
                    return;
                }
                this.lastResponseCompleteTime = now;
                this.logger.debug('Response complete detected, emitting event');
                // Task 12.3: wrap emit in try/catch to prevent listener exceptions from crashing
                try {
                    this.emit('response-complete');
                }
                catch (error) {
                    this.logger.error('Error in response-complete listener:', error);
                }
            };
            electron_1.session.defaultSession.webRequest.onCompleted(geminiApiFilter, this.responseDetectionListener);
        }
        catch (error) {
            this.logger.error('Failed to set up response detection:', error);
        }
        this.logger.log('Response detection initialized (will activate after page load + delay)');
    }
    resolveTabShortcutPayload(input) {
        if (input.isAutoRepeat) {
            return null;
        }
        const modifierPressed = process.platform === 'darwin' ? input.meta : input.control;
        if (!modifierPressed) {
            return null;
        }
        const key = input.key;
        if (key === 't' || key === 'T') {
            return { command: 'new' };
        }
        if (key === 'w' || key === 'W') {
            if (process.platform === 'darwin') {
                return null;
            }
            return { command: 'close' };
        }
        if (key === 'Tab') {
            return { command: input.shift ? 'previous' : 'next' };
        }
        if (/^[1-9]$/.test(key)) {
            return { command: 'jump', index: Number(key) - 1 };
        }
        return null;
    }
    setupTabShortcutForwarding() {
        if (!this.window) {
            return;
        }
        this.window.webContents.on('before-input-event', (event, input) => {
            // Support Ctrl+Q / Cmd+Q globally to quit the application (even when focus is in cross-origin iframe)
            if (input.type === 'keyDown' && input.key.toLowerCase() === 'q' && (input.control || input.meta)) {
                event.preventDefault();
                try {
                    electron_1.app.quit();
                }
                catch (error) {
                    this.logger.error('Error quitting app via Ctrl+Q shortcut:', error);
                }
                return;
            }
            // Support F11 globally (even when focus is in cross-origin iframe)
            if (input.type === 'keyDown' && input.key === 'F11') {
                event.preventDefault();
                if (input.isAutoRepeat) {
                    return;
                }
                const now = Date.now();
                if (now - this.lastFullscreenToggleTime < 500) {
                    return;
                }
                this.lastFullscreenToggleTime = now;
                try {
                    const isFullscreen = this.window?.isFullScreen();
                    this.window?.setFullScreen(!isFullscreen);
                }
                catch (error) {
                    this.logger.error('Error toggling fullscreen via F11 shortcut:', error);
                }
                return;
            }
            const shortcutPayload = this.resolveTabShortcutPayload(input);
            if (!shortcutPayload) {
                return;
            }
            event.preventDefault();
            this.window?.webContents.send(constants_1.IPC_CHANNELS.TABS_SHORTCUT_TRIGGERED, shortcutPayload);
        });
    }
    /**
     * Set up frame loading handler to inject Smart Enter and Scroll-to-Bottom scripts.
     */
    setupFrameLoadHandler() {
        if (!this.window)
            return;
        // Pipe subframe console messages to Electron main process terminal
        this.window.webContents.on('console-message', (_event, _level, message, line, _sourceId) => {
            if (message.includes('[GeminiDesktop]') || message.includes('[GeminiEnter]')) {
                this.logger.log(`[Iframe Console] ${message} (line ${line})`);
            }
        });
        this.window.webContents.on('did-frame-finish-load', (_event, isMainFrame, frameProcessId, frameRoutingId) => {
            try {
                if (isMainFrame)
                    return;
                const frame = electron_1.webFrameMain.fromId(frameProcessId, frameRoutingId);
                if (!frame || frame.isDestroyed())
                    return;
                const url = frame.url;
                if (!url)
                    return;
                if ((0, constants_1.isGeminiDomain)(url)) {
                    this.logger.log(`Gemini frame loaded, checking script injection status for: ${url}`);
                    this.injectGeminiScripts(frame);
                }
            }
            catch (error) {
                this.logger.error('Error in did-frame-finish-load handler:', error);
            }
        });
    }
    /**
     * Set up listeners for fullscreen events.
     */
    setupFullscreenHandlers() {
        if (!this.window)
            return;
        this.window.on('enter-full-screen', () => {
            this.logger.log('Window entered full screen');
            this.window?.webContents.send(constants_1.IPC_CHANNELS.FULLSCREEN_CHANGED, true);
        });
        this.window.on('leave-full-screen', () => {
            this.logger.log('Window left full screen');
            this.window?.webContents.send(constants_1.IPC_CHANNELS.FULLSCREEN_CHANGED, false);
        });
    }
    /**
     * Inject custom client side scripts (Smart Enter / Scroll-to-Bottom button) into the Gemini subframe.
     * Checks user preferences from store before injecting.
     */
    injectGeminiScripts(frame) {
        try {
            const preferencesStore = new store_1.default({
                configName: 'user-preferences',
            });
            const smartEnterEnabled = preferencesStore.get('smartEnterEnabled') !== false;
            const scrollToBottomButtonEnabled = preferencesStore.get('scrollToBottomButtonEnabled') !== false;
            this.logger.log('Injecting scripts into Gemini frame. Preferences:', {
                smartEnterEnabled,
                scrollToBottomButtonEnabled,
            });
            const injectionScript = `
(function() {
    'use strict';
    
    // Prevent duplicate injections
    if (window.__geminiDesktopInjected) {
        console.log('[GeminiDesktop] Scripts already injected.');
        return;
    }
    window.__geminiDesktopInjected = true;

    const smartEnterEnabled = ${smartEnterEnabled};
    const scrollToBottomButtonEnabled = ${scrollToBottomButtonEnabled};

    console.log('[GeminiDesktop] Smart Enter enabled:', smartEnterEnabled);
    console.log('[GeminiDesktop] Scroll to Bottom button enabled:', scrollToBottomButtonEnabled);

    // ==========================================
    // Helper Functions (Shadow DOM Support)
    // ==========================================
    function querySelectorDeep(selector, root = document) {
        const el = root.querySelector(selector);
        if (el) return el;
        
        const queue = [root];
        while (queue.length > 0) {
            const node = queue.shift();
            if (!node) continue;
            
            const found = node.querySelector(selector);
            if (found) return found;
            
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    queue.push(node.children[i]);
                }
            }
            if (node.shadowRoot) {
                queue.push(node.shadowRoot);
            }
        }
        return null;
    }

    function getActiveElementDeep(root = document) {
        let activeEl = root.activeElement;
        if (!activeEl) return null;
        while (activeEl.shadowRoot && activeEl.shadowRoot.activeElement) {
            activeEl = activeEl.shadowRoot.activeElement;
        }
        return activeEl;
    }

    function isElementEditable(el) {
        if (!el) return false;
        const tagName = el.tagName;
        if (tagName === 'TEXTAREA' || tagName === 'INPUT') return true;
        if (el.isContentEditable) return true;
        
        let current = el;
        while (current) {
            if (current.isContentEditable) return true;
            if (current.getAttribute && current.getAttribute('contenteditable')) return true;
            if (current.tagName === 'GEM-MEDIA-ATTACHMENT' || current.tagName === 'G-ATTACHMENT') {
                return true;
            }
            if (current.classList && (
                current.classList.contains('xap-uploader-dropzone') ||
                current.classList.contains('gem-media-attachment') ||
                current.classList.contains('uploader-preview') ||
                (typeof current.className === 'string' && (
                    current.className.indexOf('uploader') !== -1 ||
                    current.className.indexOf('attachment') !== -1
                ))
            )) {
                return true;
            }
            if (current.parentNode) {
                current = current.parentNode;
            } else if (current.host) {
                current = current.host;
            } else {
                break;
            }
        }
        return false;
    }

    function isInputEmpty(container = document) {
        const textarea = querySelectorDeep('.ql-editor', container) || 
                         querySelectorDeep('textarea', container) || 
                         querySelectorDeep('[contenteditable="true"][role="textbox"]', container) ||
                         querySelectorDeep('[contenteditable]', container);
        if (!textarea) return true;
        if (textarea.value !== undefined) {
            return textarea.value.trim() === '';
        }
        const text = textarea.textContent || '';
        const hasImg = textarea.querySelector && textarea.querySelector('img');
        return text.trim() === '' && !hasImg;
    }

    function findInputContainer(activeEl) {
        if (!activeEl) return document;
        
        let current = activeEl;
        while (current) {
            const hasSend = querySelectorDeep('button[aria-label="Send message"]', current) ||
                            querySelectorDeep('button.send-button', current) ||
                            querySelectorDeep('.send-button-container button', current) ||
                            querySelectorDeep('button[aria-label*="Send"]', current) ||
                            querySelectorDeep('button[aria-label*="send"]', current);
            if (hasSend) {
                return current;
            }
            
            if (current.parentNode) {
                current = current.parentNode;
            } else if (current.host) {
                current = current.host;
            } else {
                break;
            }
        }
        return activeEl.parentElement || document;
    }

    // ==========================================
    // 1. Smart Enter Feature
    // ==========================================
    if (smartEnterEnabled) {
        let enterQueued = false;

        function findSubmitButton(container = document) {
            const btn = querySelectorDeep('button[aria-label="Send message"]', container) ||
                        querySelectorDeep('button.send-button', container) ||
                        querySelectorDeep('.send-button-container button', container) ||
                        querySelectorDeep('button[aria-label*="Send"]', container) ||
                        querySelectorDeep('button[aria-label*="send"]', container);
            return btn;
        }

        function hasAttachment(container = document) {
            if (querySelectorDeep('gem-media-attachment', container)) return true;
            if (querySelectorDeep('g-attachment', container)) return true;
            if (querySelectorDeep('.gem-attachment-content', container)) return true;
            if (querySelectorDeep('img[class*="attachment"]', container)) return true;
            if (querySelectorDeep('[class*="attachment-style"]', container)) return true;
            if (querySelectorDeep('.uploader-preview', container)) return true;
            if (querySelectorDeep('[class*="input-area"] img', container) || querySelectorDeep('[class*="prompt"] img', container)) return true;
            if (querySelectorDeep('.ql-editor img', container)) return true;
            return false;
        }

        function isUploading(container = document) {
            // Check for progress/spinner elements
            if (querySelectorDeep('.mdc-circular-progress--indeterminate', container)) return true;
            if (querySelectorDeep('mat-progress-spinner', container)) return true;
            if (querySelectorDeep('mat-spinner', container)) return true;
            if (querySelectorDeep('[role="progressbar"]', container)) return true;
            if (querySelectorDeep('.loading-spinner', container)) return true;
            if (querySelectorDeep('progress', container)) return true;
            if (querySelectorDeep('.xap-uploader-dropzone', container)?.querySelector('.mdc-circular-progress--indeterminate')) return true;
            
            // Check for un-loaded images
            const img = querySelectorDeep('img', container);
            if (img && img.naturalWidth === 0) return true;
            
            // Check loading classes
            if (querySelectorDeep('.loading', container)) return true;
            if (querySelectorDeep('[class*="loading"]', container)) return true;
            
            // If button is disabled and there is an attachment/text, it is likely uploading
            const btn = findSubmitButton(container);
            if (btn && (btn.disabled || btn.getAttribute('aria-disabled') === 'true')) {
                return true;
            }
            
            return false;
        }

        function retrySubmit(container) {
            let attempts = 0;
            const retry = setInterval(() => {
                attempts++;
                if (!enterQueued) { clearInterval(retry); return; }
                const btn = findSubmitButton(container);
                if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
                    btn.click();
                    enterQueued = false;
                    clearInterval(retry);
                    console.log('[GeminiDesktop] Submitted queued message.');
                    return;
                }
                if (attempts > 30) {
                    enterQueued = false;
                    clearInterval(retry);
                    console.warn('[GeminiDesktop] Button stayed disabled after 30 attempts.');
                }
            }, 150);
        }

        function pollForUploadDone(container) {
            let elapsed = 0;
            const poll = setInterval(() => {
                elapsed += 100;
                if (!enterQueued) { clearInterval(poll); return; }
                if (!isUploading(container)) {
                    clearInterval(poll);
                    console.log('[GeminiDesktop] Upload complete, triggering submission.');
                    retrySubmit(container);
                    return;
                }
                if (elapsed > 30000) { // 30s timeout
                    enterQueued = false;
                    clearInterval(poll);
                    console.warn('[GeminiDesktop] Upload timed out.');
                }
            }, 100);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;

            const active = getActiveElementDeep();
            const target = e.target;
            
            const excludeTags = ['BUTTON', 'A', 'SELECT', 'OPTION'];
            const excludeRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch'];
            const isExcluded = (el) => {
                if (!el) return false;
                if (excludeTags.includes(el.tagName)) return true;
                if (el.getAttribute) {
                    const role = el.getAttribute('role');
                    if (role && excludeRoles.includes(role)) return true;
                }
                
                // Cross Shadow DOM boundary when checking closest role="dialog"
                let current = el;
                while (current) {
                    if (current.getAttribute && current.getAttribute('role') === 'dialog') {
                        return true;
                    }
                    if (current.parentNode) {
                        current = current.parentNode;
                    } else if (current.host) {
                        current = current.host;
                    } else {
                        break;
                    }
                }
                return false;
            };

            const ignored = isExcluded(active) || isExcluded(target);

            console.log('[GeminiDesktop] Enter KeyDown event. ' + 
                        'Target: ' + (target ? target.tagName : 'null') + 
                        ' (class="' + (target ? target.className : '') + '"' +
                        ' contenteditable="' + (target ? target.getAttribute('contenteditable') : '') + '"' +
                        ' isContentEditable=' + (target ? target.isContentEditable : 'false') + '), ' +
                        'Active: ' + (active ? active.tagName : 'null') + 
                        ' (class="' + (active ? active.className : '') + '"' +
                        ' contenteditable="' + (active ? active.getAttribute('contenteditable') : '') + '"' +
                        ' isContentEditable=' + (active ? active.isContentEditable : 'false') + '), ' +
                        'ignored: ' + ignored);

            if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) {
                console.log('[GeminiDesktop] Modifier key pressed, ignoring.');
                return;
            }

            if (ignored) return;

            // If active element is a different editable input/textarea, ignore
            const isPromptEditor = (el) => {
                if (!el) return false;
                if (el.classList && el.classList.contains('ql-editor')) return true;
                if (el.closest && el.closest('.ql-editor')) return true;
                return false;
            };

            const isEditable = (el) => {
                if (!el) return false;
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
                if (el.isContentEditable) return true;
                return false;
            };

            if (active && isEditable(active) && !isPromptEditor(active)) {
                console.log('[GeminiDesktop] Enter pressed in another input element, ignoring.');
                return;
            }

            // Always try to find the actual prompt editor to locate the scoped input container
            const editor = querySelectorDeep('.ql-editor') || 
                           querySelectorDeep('textarea') || 
                           querySelectorDeep('[contenteditable="true"][role="textbox"]');
            const container = (editor ? findInputContainer(editor) : null) || 
                              findInputContainer(target) || 
                              findInputContainer(active);
            const empty = isInputEmpty(container);
            const attached = hasAttachment(container);
            const uploading = isUploading(container);

            console.log('[GeminiDesktop] Queue checks:', {
                empty,
                attached,
                uploading,
                containerTagName: container ? container.tagName : 'null'
            });

            if ((!empty || attached) && uploading) {
                console.log('[GeminiDesktop] Submission intercepted & queued.');
                e.preventDefault();
                e.stopPropagation();
                if (!enterQueued) {
                    enterQueued = true;
                    pollForUploadDone(container);
                }
            } else {
                console.log('[GeminiDesktop] Not queued. (Not uploading or input completely empty with no attachments)');
            }
        }, true);
    }

    // ==========================================
    // 2. Scroll to Bottom Button Feature
    // ==========================================
    if (scrollToBottomButtonEnabled) {
        function addScrollButton() {
            if (document.getElementById('gem-scroll-btn')) return;
            const btn = document.createElement('button');
            btn.id = 'gem-scroll-btn';
            btn.textContent = '▼';
            btn.title = 'Scroll to bottom';
            Object.assign(btn.style, {
                position: 'fixed', bottom: '90px', right: '20px', zIndex: '999999',
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#1a73e8', color: '#fff', border: 'none',
                fontSize: '18px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: '1', transition: 'opacity 0.2s'
            });
            
            btn.addEventListener('click', () => {
                const containers = document.querySelectorAll('*');
                for (const el of containers) {
                    if (el.scrollHeight > el.clientHeight + 10) {
                        el.scrollTop = el.scrollHeight;
                    }
                }
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            });
            document.body.appendChild(btn);
            console.log('[GeminiDesktop] Scroll button added.');
        }

        const observer = new MutationObserver(() => {
            if (document.body && !document.getElementById('gem-scroll-btn')) {
                addScrollButton();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        addScrollButton();
    }
})();
            `;
            frame.executeJavaScript(injectionScript).catch((error) => {
                this.logger.error('Failed to execute injection script in Gemini frame:', error);
            });
        }
        catch (error) {
            this.logger.error('Error during Gemini script injection:', error);
        }
    }
}
exports.default = MainWindow;
