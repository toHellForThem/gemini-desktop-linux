"use strict";
/**
 * Electron Main Process
 *
 * This is the entry point for the Electron application.
 * It creates a frameless window with a custom titlebar and
 * strips X-Frame-Options headers to allow embedding Gemini in an iframe.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ==========================================================================
// CRITICAL: Sandbox detection MUST run before any other imports that read
// BASE_WEB_PREFERENCES from constants.ts. ES `import` statements are hoisted
// above inline code, so we use a side-effect import that performs detection
// and calls app.commandLine.appendSwitch('no-sandbox') at module load time.
// This ensures the switch is set BEFORE constants.ts evaluates sandbox state.
// ==========================================================================
require("./utils/sandboxInit.cjs");
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const security_1 = require("./utils/security.cjs");
const paths_1 = require("./utils/paths.cjs");
const platformAdapterFactory_1 = require("./platform/platformAdapterFactory.cjs");
const logger_1 = require("./utils/logger.cjs");
// Setup Logger
const logger = (0, logger_1.createLogger)('[Main]');
// Log critical environment info early for CI debugging
logger.debug('=== ELECTRON STARTUP DEBUG INFO ===');
logger.debug('Platform:', process.platform);
logger.debug('DISPLAY:', process.env.DISPLAY || 'NOT SET');
logger.debug('XDG_SESSION_TYPE:', process.env.XDG_SESSION_TYPE || 'NOT SET');
logger.debug('CI:', process.env.CI || 'NOT SET');
logger.debug('ELECTRON_USE_DIST:', process.env.ELECTRON_USE_DIST || 'NOT SET');
logger.debug('app.isReady():', electron_1.app.isReady());
logger.debug('===================================');
// Apply platform-specific configuration via adapter
const platformAdapter = (0, platformAdapterFactory_1.getPlatformAdapter)();
platformAdapter.applyAppConfiguration(electron_1.app, logger);
platformAdapter.applyAppUserModelId(electron_1.app);
/**
 * Initialize crash reporter EARLY (before app ready).
 * This is critical for preventing OS crash dialogs on Windows/macOS/Linux.
 */
const crashDumpsPath = path.join(electron_1.app.getPath('userData'), 'crashes');
electron_1.app.setPath('crashDumps', crashDumpsPath);
const crashReportUrl = process.env.CRASH_REPORT_URL || '';
electron_1.crashReporter.start({
    productName: 'Gemini Desktop',
    submitURL: crashReportUrl,
    uploadToServer: !!crashReportUrl,
    ignoreSystemCrashHandler: true,
    rateLimit: true,
    globalExtra: {
        version: electron_1.app.getVersion(),
        platform: process.platform,
        arch: process.arch,
    },
});
logger.log('Crash reporter initialized', {
    crashDumpsPath,
    uploadToServer: !!crashReportUrl,
    ignoreSystemCrashHandler: true,
});
const windowManager_1 = __importDefault(require("./managers/windowManager.cjs"));
const ipcManager_1 = __importDefault(require("./managers/ipcManager.cjs"));
const menuManager_1 = __importDefault(require("./managers/menuManager.cjs"));
const hotkeyManager_1 = __importDefault(require("./managers/hotkeyManager.cjs"));
const trayManager_1 = __importDefault(require("./managers/trayManager.cjs"));
const badgeManager_1 = __importDefault(require("./managers/badgeManager.cjs"));
const notificationManager_1 = __importDefault(require("./managers/notificationManager.cjs"));
const updateManager_1 = __importDefault(require("./managers/updateManager.cjs"));
const exportManager_1 = __importDefault(require("./managers/exportManager.cjs"));
const llmManager_1 = __importDefault(require("./managers/llmManager.cjs"));
const store_1 = __importDefault(require("./store.cjs"));
// Path to the production build
const distIndexPath = (0, paths_1.getDistHtmlPath)('index.html');
// Determine if we're in development mode
// Use production build if:
// 1. App is packaged (production), OR
// 2. ELECTRON_USE_DIST env is set (E2E testing), OR
// 3. dist/index.html exists AND dev server is not running (fallback)
const useProductionBuild = electron_1.app.isPackaged || process.env.ELECTRON_USE_DIST === 'true' || fs.existsSync(distIndexPath);
// For E2E tests, always use production build if it exists
const isDev = !useProductionBuild;
const startHidden = process.argv.includes('--hidden');
/**
 * Manager instances - initialized lazily to allow for declarative pattern.
 */
let appContext = null;
/** Handler for response-complete events (stored for cleanup) */
let responseCompleteHandler = null;
/**
 * Initialize all application managers.
 * This function encapsulates manager creation for better testability and clarity.
 */
function exposeForE2E(context) {
    const g = global;
    g.appContext = context ?? undefined;
    if (!context) {
        g.__e2eGeminiReadyBuffer = undefined;
        g.__e2eQuickChatHandler = undefined;
    }
}
function setReadyManagers(partial) {
    if (!appContext) {
        return;
    }
    const nextContext = {
        ...appContext,
        ...partial,
    };
    appContext = nextContext;
    exposeForE2E(nextContext);
}
function initializeManagers() {
    logger.debug('initializeManagers() - creating WindowManager');
    const windowManager = new windowManager_1.default(isDev);
    logger.debug('initializeManagers() - WindowManager created');
    logger.debug('initializeManagers() - creating HotkeyManager');
    const hotkeyManager = new hotkeyManager_1.default(windowManager);
    logger.debug('initializeManagers() - HotkeyManager created');
    // Create tray and badge managers
    logger.debug('initializeManagers() - creating TrayManager');
    const trayManager = new trayManager_1.default(windowManager);
    logger.debug('initializeManagers() - TrayManager created');
    logger.debug('initializeManagers() - creating BadgeManager');
    const badgeManager = new badgeManager_1.default();
    logger.debug('initializeManagers() - BadgeManager created');
    // Create settings store for auto-update preferences
    logger.debug('initializeManagers() - creating SettingsStore');
    const updateSettings = new store_1.default({
        configName: 'update-settings',
        defaults: {
            autoUpdateEnabled: true,
        },
    });
    logger.debug('initializeManagers() - SettingsStore created');
    // Create update manager with optional badge/tray dependencies
    logger.debug('initializeManagers() - creating UpdateManager');
    const updateManager = new updateManager_1.default(updateSettings, {
        badgeManager,
        trayManager,
    });
    logger.debug('initializeManagers() - UpdateManager created');
    logger.debug('initializeManagers() - creating LlmManager');
    const llmManager = new llmManager_1.default();
    logger.debug('initializeManagers() - LlmManager created');
    logger.debug('initializeManagers() - creating ExportManager');
    const exportManager = new exportManager_1.default();
    logger.debug('initializeManagers() - ExportManager created');
    logger.debug('initializeManagers() - creating IpcManager');
    const ipcManager = new ipcManager_1.default(windowManager, hotkeyManager, updateManager, exportManager, llmManager, null);
    logger.debug('initializeManagers() - IpcManager created');
    appContext = {
        windowManager,
        hotkeyManager,
        trayManager,
        badgeManager,
        updateManager,
        llmManager,
        exportManager,
        ipcManager,
        menuManager: null,
        notificationManager: null,
    };
    // Expose managers globally for E2E testing
    logger.debug('initializeManagers() - exposing managers globally');
    exposeForE2E(appContext);
    logger.debug('initializeManagers() - All managers initialized successfully');
}
/** Guard to prevent double cleanup (gracefulShutdown → process.exit → will-quit). */
let cleanupDone = false;
/**
 * Clean up all application managers and global references.
 * Shared between gracefulShutdown() and will-quit to ensure consistent cleanup.
 */
function cleanupAllManagers() {
    if (cleanupDone)
        return;
    try {
        // Unregister hotkeys first to prevent new interactions
        const context = appContext;
        if (!context) {
            cleanupDone = true;
            return;
        }
        context.hotkeyManager.unregisterAll();
        // Destroy tray
        context.trayManager.destroyTray();
        // Destroy update manager (stops periodic checks)
        context.updateManager.destroy();
        // Dispose LLM manager to free model resources
        context.llmManager.dispose();
        // Dispose IPC handlers to remove all listeners
        context.ipcManager.dispose();
        // Clean up response-complete listener
        const mainWindowInstance = context.windowManager.getMainWindowInstance();
        if (mainWindowInstance && responseCompleteHandler) {
            mainWindowInstance.off('response-complete', responseCompleteHandler);
            responseCompleteHandler = null;
        }
        // Clean up NotificationManager event listeners
        if (context.notificationManager) {
            context.notificationManager.dispose();
        }
        // Set quitting flag so windows don't try to prevent close
        context.windowManager.setQuitting(true);
        // Null out global manager references to allow garbage collection
        appContext = null;
        exposeForE2E(null);
        // Mark cleanup as done only after all cleanup steps complete successfully
        cleanupDone = true;
    }
    catch (error) {
        logger.error('Error during cleanup:', error);
        // Still mark as done to prevent infinite retry loops
        cleanupDone = true;
    }
}
/**
 * Gracefully shut down the application.
 * Cleans up all managers before exiting.
 * @param exitCode - The exit code to use when exiting
 */
function gracefulShutdown(exitCode = 0) {
    logger.log(`Initiating graceful shutdown with exit code ${exitCode}...`);
    try {
        cleanupAllManagers();
        logger.log('Graceful shutdown completed');
    }
    catch (cleanupError) {
        // Log cleanup errors but don't throw - we still need to exit
        console.error('[Main] Error during graceful shutdown:', cleanupError);
    }
    // Give logs time to flush, then exit
    setTimeout(() => {
        process.exit(exitCode);
    }, 500);
}
// Initialize managers before requesting instance lock
logger.debug('About to call initializeManagers()');
initializeManagers();
logger.debug('initializeManagers() completed');
// Single Instance Lock
logger.debug('About to request single instance lock');
const gotTheLock = electron_1.app.requestSingleInstanceLock();
logger.debug('Single instance lock result:', gotTheLock);
if (!gotTheLock) {
    logger.log('Another instance is already running. Quitting...');
    electron_1.app.exit(0);
}
else {
    logger.debug('Got the lock, setting up second-instance handler');
    electron_1.app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        logger.log('Second instance detected. Focusing existing window...');
        if (appContext) {
            if (appContext.windowManager.getMainWindow()) {
                appContext.windowManager.restoreFromTray();
            }
            else {
                appContext.windowManager.createMainWindow({ startHidden: false });
            }
        }
    });
    // App lifecycle
    logger.debug('Setting up app.whenReady() handler');
    logger.debug('Current app.isReady():', electron_1.app.isReady());
    // Also listen to the 'ready' event directly for debugging
    electron_1.app.on('ready', () => {
        logger.debug('app "ready" event fired!');
    });
    // Log if whenReady takes too long
    const readyTimeout = setTimeout(() => {
        logger.debug('WARNING: app.whenReady() has not resolved after 10 seconds!');
        logger.debug('DISPLAY:', process.env.DISPLAY);
        logger.debug('This may indicate a display/xvfb issue');
    }, 10000);
    electron_1.app.whenReady().then(() => {
        clearTimeout(readyTimeout);
        logger.debug('app.whenReady() resolved!');
        logger.log('App ready - starting initialization');
        // Apply security settings to default session (used by all windows)
        (0, security_1.setupHeaderStripping)(electron_1.session.defaultSession);
        (0, security_1.setupMediaPermissions)(electron_1.session.defaultSession);
        appContext?.ipcManager.setupIpcHandlers();
        if (process.argv.includes('--e2e-disable-auto-submit')) {
            global.__e2eGeminiReadyBuffer = { enabled: true, pending: [] };
        }
        // Setup native application menu (critical for macOS)
        if (!appContext) {
            return;
        }
        const tabStateIpcHandler = appContext.ipcManager.getTabStateIpcHandler();
        const menuManager = new menuManager_1.default(appContext.windowManager, appContext.hotkeyManager, undefined, tabStateIpcHandler);
        menuManager.buildMenu();
        menuManager.setupContextMenu();
        setReadyManagers({ menuManager });
        logger.log('Menu setup complete');
        logger.debug('About to create main window');
        appContext.windowManager.createMainWindow({ startHidden });
        logger.debug('createMainWindow() returned');
        logger.log('Main window created');
        // Set main window reference for badge manager (needed for Windows overlay)
        appContext.badgeManager.setMainWindow(appContext.windowManager.getMainWindow());
        logger.log('Badge manager configured');
        // Create notification manager for response notifications
        const mainWindow = appContext.windowManager.getMainWindow();
        if (mainWindow) {
            const notificationSettings = new store_1.default({
                configName: 'notification-settings',
                defaults: {
                    responseNotificationsEnabled: true,
                },
            });
            const notificationManager = new notificationManager_1.default(mainWindow, appContext.badgeManager, notificationSettings, platformAdapter);
            // Subscribe to response-complete events from MainWindow
            const mainWindowInstance = appContext.windowManager.getMainWindowInstance();
            if (mainWindowInstance) {
                // Store handler reference for cleanup in will-quit
                responseCompleteHandler = () => {
                    // Wrap in try/catch to protect against crashes (task 11.6)
                    try {
                        notificationManager.onResponseComplete();
                    }
                    catch (error) {
                        logger.error('Error in NotificationManager.onResponseComplete:', error);
                    }
                };
                mainWindowInstance.on('response-complete', responseCompleteHandler);
                logger.log('NotificationManager subscribed to response-complete events');
            }
            setReadyManagers({ notificationManager });
            logger.log('NotificationManager configured');
            // Inject NotificationManager into IpcManager for response notification IPC handlers
            appContext.ipcManager.setNotificationManager(notificationManager);
        }
        // Create system tray icon (may fail on headless Linux environments)
        try {
            appContext.trayManager.createTray();
            logger.log('System tray created successfully');
            if (startHidden) {
                appContext.windowManager.hideToTray();
            }
        }
        catch (error) {
            // Tray creation can fail on headless Linux (e.g., Ubuntu CI with Xvfb)
            // This is non-fatal - the app should continue without tray functionality
            logger.warn('Failed to create system tray (expected in headless environments):', error);
            if (startHidden) {
                appContext.windowManager.focusMainWindow();
            }
        }
        // Security: Block webview creation attempts from renderer content
        (0, security_1.setupWebviewSecurity)(electron_1.app);
        appContext.hotkeyManager.registerShortcuts();
        logger.log('Hotkeys registered');
        // Initialize text prediction (auto-load model if enabled)
        // This is async but we don't need to block startup on it
        appContext.ipcManager.initializeTextPrediction().catch((error) => {
            logger.error('Failed to initialize text prediction:', error);
        });
        if (electron_1.app.isPackaged && !process.argv.includes('--test-auto-update') && !process.env.TEST_AUTO_UPDATE) {
            appContext.updateManager.startPeriodicChecks();
        }
        electron_1.app.on('activate', () => {
            // On macOS, recreate window when dock icon is clicked
            if (electron_1.BrowserWindow.getAllWindows().length === 0 && appContext) {
                appContext.windowManager.createMainWindow({ startHidden: false });
            }
        });
    });
}
// Quit when all windows are closed (except on macOS)
electron_1.app.on('window-all-closed', () => {
    if ((0, platformAdapterFactory_1.getPlatformAdapter)().shouldQuitOnWindowAllClosed()) {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', () => {
    if (appContext) {
        appContext.windowManager.setQuitting(true);
    }
});
electron_1.app.on('will-quit', () => {
    cleanupAllManagers();
});
// App-level crash handlers to prevent OS crash dialogs
// These handle crashes in renderer and child processes gracefully
/**
 * Handle renderer process crashes.
 * This fires when a renderer process crashes or is killed.
 * @see https://electronjs.org/docs/api/app#event-render-process-gone
 */
electron_1.app.on('render-process-gone', (_event, webContents, details) => {
    logger.error('Renderer process gone:', {
        reason: details.reason,
        exitCode: details.exitCode,
        title: webContents.getTitle(),
    });
    // If not killed intentionally, try to recover by reloading the window
    if (details.reason !== 'killed') {
        const win = electron_1.BrowserWindow.fromWebContents(webContents);
        if (win && !win.isDestroyed()) {
            logger.log('Attempting to reload crashed renderer...');
            win.reload();
        }
    }
});
/**
 * Handle child process crashes.
 * This fires when a child process (GPU, utility, etc.) crashes.
 * @see https://electronjs.org/docs/api/app#event-child-process-gone
 */
electron_1.app.on('child-process-gone', (_event, details) => {
    logger.error('Child process gone:', {
        type: details.type,
        reason: details.reason,
        exitCode: details.exitCode,
        serviceName: details.serviceName || 'N/A',
        name: details.name || 'N/A',
    });
});
// Global error handlers for unhandled promises and exceptions
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: String(promise),
    });
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
    });
    // Also log to console as a backup in case logger fails
    console.error('[Main] FATAL: Uncaught Exception:', error);
    // Perform graceful shutdown
    gracefulShutdown(1);
});
// Handle SIGTERM for containerized/CI environments
process.on('SIGTERM', () => {
    logger.log('Received SIGTERM signal');
    gracefulShutdown(0);
});
// Handle SIGINT (Ctrl+C) for development
process.on('SIGINT', () => {
    logger.log('Received SIGINT signal');
    gracefulShutdown(0);
});
