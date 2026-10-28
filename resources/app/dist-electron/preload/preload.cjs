"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// dist-electron/shared/constants/ipc-channels.cjs
var require_ipc_channels = __commonJS({
  "dist-electron/shared/constants/ipc-channels.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.IPC_CHANNELS = void 0;
    exports2.IPC_CHANNELS = {
      // Window controls
      WINDOW_MINIMIZE: "window-minimize",
      WINDOW_MAXIMIZE: "window-maximize",
      WINDOW_CLOSE: "window-close",
      WINDOW_SHOW: "window-show",
      WINDOW_IS_MAXIMIZED: "window-is-maximized",
      WINDOW_IS_FULLSCREEN: "window-is-fullscreen",
      FULLSCREEN_TOGGLE: "window-toggle-fullscreen",
      FULLSCREEN_CHANGED: "window-fullscreen-changed",
      // Theme
      THEME_GET: "theme:get",
      THEME_SET: "theme:set",
      THEME_CHANGED: "theme:changed",
      // App
      OPEN_OPTIONS: "open-options-window",
      OPEN_GOOGLE_SIGNIN: "open-google-signin",
      APP_RESTART: "app:restart",
      APP_QUIT: "app:quit",
      // Quick Chat
      QUICK_CHAT_SUBMIT: "quick-chat:submit",
      QUICK_CHAT_HIDE: "quick-chat:hide",
      QUICK_CHAT_CANCEL: "quick-chat:cancel",
      QUICK_CHAT_EXECUTE: "quick-chat:execute",
      // Gemini Iframe Navigation (for Quick Chat integration)
      GEMINI_NAVIGATE: "gemini:navigate",
      GEMINI_READY: "gemini:ready",
      TABS_GET_STATE: "tabs:get-state",
      TABS_SAVE_STATE: "tabs:save-state",
      TABS_UPDATE_TITLE: "tabs:update-title",
      TABS_TITLE_UPDATED: "tabs:title-updated",
      TABS_SHORTCUT_TRIGGERED: "tabs:shortcut-triggered",
      TABS_RELOAD: "tabs:reload",
      // Always On Top
      ALWAYS_ON_TOP_GET: "always-on-top:get",
      ALWAYS_ON_TOP_SET: "always-on-top:set",
      ALWAYS_ON_TOP_CHANGED: "always-on-top:changed",
      // Zoom
      ZOOM_GET_LEVEL: "zoom:get-level",
      ZOOM_IN: "zoom:zoom-in",
      ZOOM_OUT: "zoom:zoom-out",
      ZOOM_LEVEL_CHANGED: "zoom:level-changed",
      // Individual Hotkeys
      HOTKEYS_INDIVIDUAL_GET: "hotkeys:individual:get",
      HOTKEYS_INDIVIDUAL_SET: "hotkeys:individual:set",
      HOTKEYS_INDIVIDUAL_CHANGED: "hotkeys:individual:changed",
      // Hotkey Accelerators
      HOTKEYS_ACCELERATOR_GET: "hotkeys:accelerator:get",
      HOTKEYS_ACCELERATOR_SET: "hotkeys:accelerator:set",
      HOTKEYS_ACCELERATOR_CHANGED: "hotkeys:accelerator:changed",
      HOTKEYS_FULL_SETTINGS_GET: "hotkeys:full-settings:get",
      // Auto-Update
      AUTO_UPDATE_GET_ENABLED: "auto-update:get-enabled",
      AUTO_UPDATE_SET_ENABLED: "auto-update:set-enabled",
      AUTO_UPDATE_CHECK: "auto-update:check",
      AUTO_UPDATE_INSTALL: "auto-update:install",
      AUTO_UPDATE_GET_LAST_CHECK: "auto-update:get-last-check",
      AUTO_UPDATE_AVAILABLE: "auto-update:available",
      AUTO_UPDATE_DOWNLOADED: "auto-update:downloaded",
      AUTO_UPDATE_ERROR: "auto-update:error",
      AUTO_UPDATE_CHECKING: "auto-update:checking",
      AUTO_UPDATE_NOT_AVAILABLE: "auto-update:not-available",
      AUTO_UPDATE_DOWNLOAD_PROGRESS: "auto-update:download-progress",
      AUTO_UPDATE_MANUAL_UPDATE_AVAILABLE: "auto-update:manual-update-available",
      // Tray
      TRAY_GET_TOOLTIP: "tray:get-tooltip",
      EXPORT_CHAT_PDF: "export-chat:pdf",
      EXPORT_CHAT_MARKDOWN: "export-chat:markdown",
      // Toast (main process → renderer notifications)
      TOAST_SHOW: "toast:show",
      // Shell (filesystem operations)
      SHELL_SHOW_ITEM_IN_FOLDER: "shell:show-item-in-folder",
      // Response Notifications
      RESPONSE_NOTIFICATIONS_GET_ENABLED: "response-notifications:get-enabled",
      RESPONSE_NOTIFICATIONS_SET_ENABLED: "response-notifications:set-enabled",
      // Smart Enter & Chat Scroll
      SMART_ENTER_GET_ENABLED: "smart-enter:get-enabled",
      SMART_ENTER_SET_ENABLED: "smart-enter:set-enabled",
      SCROLL_TO_BOTTOM_GET_ENABLED: "scroll-to-bottom:get-enabled",
      SCROLL_TO_BOTTOM_SET_ENABLED: "scroll-to-bottom:set-enabled",
      // Launch at Startup
      LAUNCH_AT_STARTUP_GET: "launch-at-startup:get",
      LAUNCH_AT_STARTUP_SET: "launch-at-startup:set",
      START_MINIMIZED_GET: "start-minimized:get",
      START_MINIMIZED_SET: "start-minimized:set",
      // Text Prediction (local LLM inference)
      TEXT_PREDICTION_GET_ENABLED: "text-prediction:get-enabled",
      TEXT_PREDICTION_SET_ENABLED: "text-prediction:set-enabled",
      TEXT_PREDICTION_GET_GPU_ENABLED: "text-prediction:get-gpu-enabled",
      TEXT_PREDICTION_SET_GPU_ENABLED: "text-prediction:set-gpu-enabled",
      TEXT_PREDICTION_GET_STATUS: "text-prediction:get-status",
      TEXT_PREDICTION_STATUS_CHANGED: "text-prediction:status-changed",
      TEXT_PREDICTION_DOWNLOAD_PROGRESS: "text-prediction:download-progress",
      TEXT_PREDICTION_PREDICT: "text-prediction:predict",
      // Platform Status
      PLATFORM_HOTKEY_STATUS_GET: "platform:hotkey-status:get",
      PLATFORM_HOTKEY_STATUS_CHANGED: "platform:hotkey-status:changed",
      // Test-only: D-Bus activation signal tracking (Wayland integration tests)
      DBUS_ACTIVATION_SIGNAL_STATS_GET: "test:dbus:activation-signal-stats:get",
      DBUS_ACTIVATION_SIGNAL_HISTORY_CLEAR: "test:dbus:activation-signal-history:clear",
      // Dev Testing (only used in development for manual testing)
      DEV_TEST_SHOW_BADGE: "dev:test:show-badge",
      DEV_TEST_CLEAR_BADGE: "dev:test:clear-badge",
      DEV_TEST_SET_UPDATE_ENABLED: "dev:test:set-update-enabled",
      DEV_TEST_EMIT_UPDATE_EVENT: "dev:test:emit-update-event",
      DEV_TEST_MOCK_PLATFORM: "dev:test:mock-platform",
      DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION: "dev:test:trigger-response-notification",
      DEBUG_TRIGGER_ERROR: "debug-trigger-error"
    };
  }
});

// dist-electron/preload/createSubscription.cjs
var require_createSubscription = __commonJS({
  "dist-electron/preload/createSubscription.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createSubscription = createSubscription;
    exports2.createSignalSubscription = createSignalSubscription;
    var electron_12 = require("electron");
    function createSubscription(channel) {
      return (callback) => {
        const handler = (_event, data) => callback(data);
        electron_12.ipcRenderer.on(channel, handler);
        return () => {
          electron_12.ipcRenderer.removeListener(channel, handler);
        };
      };
    }
    function createSignalSubscription(channel) {
      return (callback) => {
        const handler = () => callback();
        electron_12.ipcRenderer.on(channel, handler);
        return () => {
          electron_12.ipcRenderer.removeListener(channel, handler);
        };
      };
    }
  }
});

// dist-electron/preload/api/alwaysOnTop.cjs
var require_alwaysOnTop = __commonJS({
  "dist-electron/preload/api/alwaysOnTop.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.alwaysOnTopAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.alwaysOnTopAPI = {
      getAlwaysOnTop: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ALWAYS_ON_TOP_GET),
      setAlwaysOnTop: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.ALWAYS_ON_TOP_SET, enabled),
      onAlwaysOnTopChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED)
    };
  }
});

// dist-electron/preload/api/devTesting.cjs
var require_devTesting = __commonJS({
  "dist-electron/preload/api/devTesting.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.devTestingAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    var TEST_ONLY_DBUS_SIGNALS_ENABLED = process.env.NODE_ENV === "test" || process.env.DEBUG_DBUS === "1";
    exports2.devTestingAPI = {
      devShowBadge: (version) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_SHOW_BADGE, version),
      devClearBadge: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_CLEAR_BADGE),
      devSetUpdateEnabled: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, enabled),
      devEmitUpdateEvent: (event, data) => {
        const safeData = data instanceof Error ? {
          name: data.name,
          message: data.message
        } : data;
        electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, event, safeData);
      },
      devMockPlatform: (platform, env) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM, platform, env),
      devTriggerResponseNotification: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION),
      getDbusActivationSignalStats: TEST_ONLY_DBUS_SIGNALS_ENABLED ? () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_STATS_GET) : () => Promise.resolve({
        trackingEnabled: false,
        totalSignals: 0,
        signalsByShortcut: {},
        lastSignalTime: null,
        signals: Object.freeze([])
      }),
      clearDbusActivationSignalHistory: TEST_ONLY_DBUS_SIGNALS_ENABLED ? () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_HISTORY_CLEAR) : () => {
      },
      getTrayTooltip: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TRAY_GET_TOOLTIP),
      onDebugTriggerError: (0, createSubscription_1.createSignalSubscription)(ipc_channels_1.IPC_CHANNELS.DEBUG_TRIGGER_ERROR)
    };
  }
});

// dist-electron/preload/api/export.cjs
var require_export = __commonJS({
  "dist-electron/preload/api/export.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.exportAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    exports2.exportAPI = {
      exportChatToPdf: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_PDF),
      exportChatToMarkdown: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_MARKDOWN)
    };
  }
});

// dist-electron/preload/api/gemini.cjs
var require_gemini = __commonJS({
  "dist-electron/preload/api/gemini.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.geminiAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.geminiAPI = {
      onGeminiNavigate: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.GEMINI_NAVIGATE),
      signalGeminiReady: (payload) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.GEMINI_READY, payload),
      getTabState: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TABS_GET_STATE),
      saveTabState: (state) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.TABS_SAVE_STATE, state),
      onTabShortcutTriggered: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TABS_SHORTCUT_TRIGGERED),
      onTabTitleUpdated: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TABS_TITLE_UPDATED),
      updateTabTitle: (tabId, title) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.TABS_UPDATE_TITLE, { tabId, title }),
      reloadTabs: (activeTabId) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.TABS_RELOAD, activeTabId ? { activeTabId } : void 0)
    };
  }
});

// dist-electron/preload/api/hotkeys.cjs
var require_hotkeys = __commonJS({
  "dist-electron/preload/api/hotkeys.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.hotkeysAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.hotkeysAPI = {
      getIndividualHotkeys: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET),
      setIndividualHotkey: (id, enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, id, enabled),
      onIndividualHotkeysChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED),
      getHotkeyAccelerators: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET),
      getFullHotkeySettings: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET),
      setHotkeyAccelerator: (id, accelerator) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET, id, accelerator),
      onHotkeyAcceleratorsChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED)
    };
  }
});

// dist-electron/preload/api/notifications.cjs
var require_notifications = __commonJS({
  "dist-electron/preload/api/notifications.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.notificationsAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    exports2.notificationsAPI = {
      getResponseNotificationsEnabled: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED),
      setResponseNotificationsEnabled: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED, enabled)
    };
  }
});

// dist-electron/preload/api/platform.cjs
var require_platform = __commonJS({
  "dist-electron/preload/api/platform.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.platformAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.platformAPI = {
      platform: process.platform,
      isElectron: true,
      getPlatformHotkeyStatus: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.PLATFORM_HOTKEY_STATUS_GET),
      onPlatformHotkeyStatusChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.PLATFORM_HOTKEY_STATUS_CHANGED)
    };
  }
});

// dist-electron/preload/api/quickChat.cjs
var require_quickChat = __commonJS({
  "dist-electron/preload/api/quickChat.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.quickChatAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.quickChatAPI = {
      submitQuickChat: (text) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_SUBMIT, text),
      hideQuickChat: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_HIDE),
      cancelQuickChat: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_CANCEL),
      onQuickChatExecute: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_EXECUTE)
    };
  }
});

// dist-electron/preload/api/shell.cjs
var require_shell = __commonJS({
  "dist-electron/preload/api/shell.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.shellAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    exports2.shellAPI = {
      revealInFolder: (path) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.SHELL_SHOW_ITEM_IN_FOLDER, path)
    };
  }
});

// dist-electron/preload/api/startup.cjs
var require_startup = __commonJS({
  "dist-electron/preload/api/startup.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.startupAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    exports2.startupAPI = {
      getLaunchAtStartup: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_GET),
      setLaunchAtStartup: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_SET, enabled),
      getStartMinimized: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.START_MINIMIZED_GET),
      setStartMinimized: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.START_MINIMIZED_SET, enabled)
    };
  }
});

// dist-electron/preload/api/textPrediction.cjs
var require_textPrediction = __commonJS({
  "dist-electron/preload/api/textPrediction.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.textPredictionAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.textPredictionAPI = {
      getTextPredictionEnabled: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED),
      setTextPredictionEnabled: (enabled) => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED, enabled),
      getTextPredictionGpuEnabled: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_GET_GPU_ENABLED),
      setTextPredictionGpuEnabled: (enabled) => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED, enabled),
      getTextPredictionStatus: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS),
      onTextPredictionStatusChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_STATUS_CHANGED),
      onTextPredictionDownloadProgress: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_DOWNLOAD_PROGRESS),
      predictText: (partialText) => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_PREDICT, partialText)
    };
  }
});

// dist-electron/preload/api/theme.cjs
var require_theme = __commonJS({
  "dist-electron/preload/api/theme.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.themeAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.themeAPI = {
      getTheme: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.THEME_GET),
      setTheme: (theme) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.THEME_SET, theme),
      onThemeChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.THEME_CHANGED)
    };
  }
});

// dist-electron/preload/api/toast.cjs
var require_toast = __commonJS({
  "dist-electron/preload/api/toast.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.toastAPI = void 0;
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.toastAPI = {
      onToastShow: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW)
    };
  }
});

// dist-electron/preload/api/updates.cjs
var require_updates = __commonJS({
  "dist-electron/preload/api/updates.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.updatesAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.updatesAPI = {
      getAutoUpdateEnabled: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED),
      setAutoUpdateEnabled: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, enabled),
      checkForUpdates: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECK),
      installUpdate: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_INSTALL),
      onUpdateAvailable: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_AVAILABLE),
      onUpdateDownloaded: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED),
      onUpdateError: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR),
      onManualUpdateAvailable: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_MANUAL_UPDATE_AVAILABLE),
      onUpdateNotAvailable: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE),
      onDownloadProgress: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS),
      onCheckingForUpdate: (0, createSubscription_1.createSignalSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECKING),
      getLastUpdateCheckTime: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK)
    };
  }
});

// dist-electron/preload/api/window.cjs
var require_window = __commonJS({
  "dist-electron/preload/api/window.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.windowAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.windowAPI = {
      minimizeWindow: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_MINIMIZE),
      maximizeWindow: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_MAXIMIZE),
      closeWindow: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_CLOSE),
      showWindow: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_SHOW),
      isMaximized: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
      isFullscreen: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.WINDOW_IS_FULLSCREEN),
      toggleFullscreen: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.FULLSCREEN_TOGGLE),
      onFullscreenChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.FULLSCREEN_CHANGED),
      openOptions: (tab) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.OPEN_OPTIONS, tab),
      openGoogleSignIn: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.OPEN_GOOGLE_SIGNIN),
      restartApp: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.APP_RESTART),
      quitApp: () => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.APP_QUIT)
    };
  }
});

// dist-electron/preload/api/zoom.cjs
var require_zoom = __commonJS({
  "dist-electron/preload/api/zoom.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.zoomAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    var createSubscription_1 = require_createSubscription();
    exports2.zoomAPI = {
      getZoomLevel: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ZOOM_GET_LEVEL),
      zoomIn: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ZOOM_IN),
      zoomOut: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ZOOM_OUT),
      onZoomLevelChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.ZOOM_LEVEL_CHANGED)
    };
  }
});

// dist-electron/preload/api/smartEnter.cjs
var require_smartEnter = __commonJS({
  "dist-electron/preload/api/smartEnter.cjs"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.smartEnterAPI = void 0;
    var electron_12 = require("electron");
    var ipc_channels_1 = require_ipc_channels();
    exports2.smartEnterAPI = {
      getSmartEnterEnabled: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.SMART_ENTER_GET_ENABLED),
      setSmartEnterEnabled: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.SMART_ENTER_SET_ENABLED, enabled),
      getScrollToBottomButtonEnabled: () => electron_12.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED),
      setScrollToBottomButtonEnabled: (enabled) => electron_12.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED, enabled)
    };
  }
});

// dist-electron/preload/preload.cjs
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var alwaysOnTop_1 = require_alwaysOnTop();
var devTesting_1 = require_devTesting();
var export_1 = require_export();
var gemini_1 = require_gemini();
var hotkeys_1 = require_hotkeys();
var notifications_1 = require_notifications();
var platform_1 = require_platform();
var quickChat_1 = require_quickChat();
var shell_1 = require_shell();
var startup_1 = require_startup();
var textPrediction_1 = require_textPrediction();
var theme_1 = require_theme();
var toast_1 = require_toast();
var updates_1 = require_updates();
var window_1 = require_window();
var zoom_1 = require_zoom();
var smartEnter_1 = require_smartEnter();
var electronAPI = {
  ...window_1.windowAPI,
  ...platform_1.platformAPI,
  ...theme_1.themeAPI,
  ...quickChat_1.quickChatAPI,
  ...gemini_1.geminiAPI,
  ...hotkeys_1.hotkeysAPI,
  ...alwaysOnTop_1.alwaysOnTopAPI,
  ...zoom_1.zoomAPI,
  ...updates_1.updatesAPI,
  ...devTesting_1.devTestingAPI,
  ...toast_1.toastAPI,
  ...shell_1.shellAPI,
  ...textPrediction_1.textPredictionAPI,
  ...notifications_1.notificationsAPI,
  ...startup_1.startupAPI,
  ...export_1.exportAPI,
  ...smartEnter_1.smartEnterAPI
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
console.log("[Preload] Electron API exposed to renderer");
