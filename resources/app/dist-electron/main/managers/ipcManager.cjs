"use strict";
/**
 * IPC Manager for the Electron main process.
 *
 * Centralizes all IPC (Inter-Process Communication) handlers between the
 * renderer and main processes. This architecture enables:
 * - Clean separation of concerns
 * - Easy extension for new IPC channels
 * - Consistent error handling across all handlers
 * - Cross-platform compatibility (Windows, macOS, Linux)
 *
 * @module IpcManager
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./ipc/index.cjs");
const store_1 = __importDefault(require("../store.cjs"));
const logger_1 = require("../utils/logger.cjs");
const hotkeys_1 = require("../../shared/types/hotkeys.cjs");
/**
 * Manages IPC communication between main and renderer processes.
 * Orchestrates domain-specific handlers for all IPC channels.
 */
class IpcManager {
    handlers = [];
    textPredictionHandler;
    responseNotificationHandler;
    quickChatHandler;
    tabStateHandler;
    logger;
    handlerDeps;
    /** Settings store exposed for integration tests */
    store;
    /**
     * Creates a new IpcManager instance.
     * @param windowManager - The window manager instance
     * @param hotkeyManager - Optional hotkey manager for hotkey handling
     * @param updateManager - Optional update manager for auto-updates
     * @param printManager - Optional print manager for PDF printing
     * @param llmManager - Optional LLM manager for text prediction
     * @param notificationManager - Optional notification manager for response notifications
     * @param store - Optional store instance for testing
     * @param logger - Optional logger instance for testing
     */
    constructor(windowManager, hotkeyManager, updateManager, exportManager, llmManager, notificationManager, store, logger) {
        /* v8 ignore next 16 -- production fallback, tests always inject dependencies */
        const actualStore = store ||
            new store_1.default({
                configName: 'user-preferences',
                defaults: {
                    theme: 'system',
                    alwaysOnTop: false,
                    hotkeyAlwaysOnTop: true,
                    hotkeyPeekAndHide: true,
                    hotkeyQuickChat: true,
                    hotkeyVoiceChat: true,
                    hotkeyPrintToPdf: true,
                    acceleratorAlwaysOnTop: hotkeys_1.DEFAULT_ACCELERATORS.alwaysOnTop,
                    acceleratorPeekAndHide: hotkeys_1.DEFAULT_ACCELERATORS.peekAndHide,
                    acceleratorQuickChat: hotkeys_1.DEFAULT_ACCELERATORS.quickChat,
                    acceleratorVoiceChat: hotkeys_1.DEFAULT_ACCELERATORS.voiceChat,
                    acceleratorPrintToPdf: hotkeys_1.DEFAULT_ACCELERATORS.printToPdf,
                    autoUpdateEnabled: true,
                    textPredictionEnabled: false,
                    textPredictionGpuEnabled: false,
                    textPredictionModelStatus: 'not-downloaded',
                    textPredictionModelId: 'qwen3-0.6b',
                    zoomLevel: 100,
                    responseNotificationsEnabled: true,
                    launchAtStartup: false,
                    startMinimized: false,
                    smartEnterEnabled: true,
                    scrollToBottomButtonEnabled: true,
                },
            });
        /* v8 ignore next -- production fallback, tests always inject logger */
        this.logger = logger || (0, logger_1.createLogger)('[IpcManager]');
        this.store = actualStore;
        // Create shared handler dependencies
        const handlerDeps = {
            store: actualStore,
            logger: this.logger,
            windowManager: windowManager,
            hotkeyManager: hotkeyManager || null,
            updateManager: updateManager || null,
            llmManager: llmManager || null,
            notificationManager: notificationManager || null,
            exportManager: exportManager || null,
        };
        this.handlerDeps = handlerDeps;
        // Create TextPredictionIpcHandler first (we need reference for initializeTextPrediction)
        this.textPredictionHandler = new index_1.TextPredictionIpcHandler(handlerDeps);
        // Create ResponseNotificationIpcHandler (we need reference for setNotificationManager)
        this.responseNotificationHandler = new index_1.ResponseNotificationIpcHandler(handlerDeps);
        this.quickChatHandler = new index_1.QuickChatIpcHandler(handlerDeps);
        if (process.argv.includes('--e2e-disable-auto-submit')) {
            global.__e2eQuickChatHandler =
                this.quickChatHandler;
        }
        // Instantiate all handlers
        this.tabStateHandler = new index_1.TabStateIpcHandler(handlerDeps);
        this.handlers = [
            // Phase 1 handlers
            new index_1.ShellIpcHandler(handlerDeps),
            new index_1.WindowIpcHandler(handlerDeps),
            // Phase 2 handlers
            new index_1.ThemeIpcHandler(handlerDeps),
            new index_1.ZoomIpcHandler(handlerDeps),
            new index_1.AlwaysOnTopIpcHandler(handlerDeps),
            // Phase 3 handlers
            new index_1.HotkeyIpcHandler(handlerDeps),
            new index_1.AppIpcHandler(handlerDeps),
            // Phase 4 handlers
            new index_1.AutoUpdateIpcHandler(handlerDeps),
            this.quickChatHandler,
            this.textPredictionHandler,
            // Response notification handler
            this.responseNotificationHandler,
            new index_1.LaunchAtStartupIpcHandler(handlerDeps),
            // Export handler
            new index_1.ExportIpcHandler(handlerDeps),
            this.tabStateHandler,
            new index_1.SmartEnterIpcHandler(handlerDeps),
        ];
        this.logger.log('Initialized');
    }
    /**
     * Set up all IPC handlers.
     * Call this after app is ready.
     */
    setupIpcHandlers() {
        // Register all domain-specific handlers
        for (const handler of this.handlers) {
            handler.register();
        }
        // Initialize handlers that need initialization after registration
        for (const handler of this.handlers) {
            if (handler.initialize) {
                handler.initialize();
            }
        }
        this.logger.log('All IPC handlers registered');
    }
    /**
     * Initialize text prediction on app startup.
     * Delegates to TextPredictionIpcHandler.initializeOnStartup().
     * Should be called after setupIpcHandlers().
     */
    async initializeTextPrediction() {
        await this.textPredictionHandler.initializeOnStartup();
    }
    /**
     * Set the NotificationManager for response notifications.
     * This is used for late injection when NotificationManager is created after IpcManager.
     * @param manager - The NotificationManager instance to use
     */
    setNotificationManager(manager) {
        this.handlerDeps.notificationManager = manager;
        this.responseNotificationHandler.setNotificationManager(manager);
        this.logger.log(`NotificationManager ${manager ? 'injected' : 'cleared'}`);
    }
    getTabStateIpcHandler() {
        return this.tabStateHandler;
    }
    /**
     * Clean up all IPC handlers.
     * Calls unregister() on all handlers that implement it.
     * Should be called during app shutdown to prevent memory leaks.
     */
    dispose() {
        for (const handler of this.handlers) {
            if (handler.unregister) {
                try {
                    handler.unregister();
                }
                catch (error) {
                    this.logger.error('Error unregistering handler:', error);
                }
            }
        }
        this.logger.log('All IPC handlers unregistered');
    }
}
exports.default = IpcManager;
