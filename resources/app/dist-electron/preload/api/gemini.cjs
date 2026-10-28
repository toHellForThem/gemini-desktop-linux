"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.geminiAPI = {
    onGeminiNavigate: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.GEMINI_NAVIGATE),
    signalGeminiReady: (payload) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.GEMINI_READY, payload),
    getTabState: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TABS_GET_STATE),
    saveTabState: (state) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.TABS_SAVE_STATE, state),
    onTabShortcutTriggered: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TABS_SHORTCUT_TRIGGERED),
    onTabTitleUpdated: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TABS_TITLE_UPDATED),
    updateTabTitle: (tabId, title) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.TABS_UPDATE_TITLE, { tabId, title }),
    reloadTabs: (activeTabId) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.TABS_RELOAD, activeTabId ? { activeTabId } : undefined),
};
