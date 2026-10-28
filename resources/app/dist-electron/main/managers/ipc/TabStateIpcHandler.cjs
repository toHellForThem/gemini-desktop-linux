"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabStateIpcHandler = void 0;
const node_crypto_1 = require("node:crypto");
const electron_1 = require("electron");
const store_1 = __importDefault(require("../../store.cjs"));
const constants_1 = require("../../utils/constants.cjs");
const urls_1 = require("../../../shared/constants/urls.cjs");
const tabs_1 = require("../../../shared/types/tabs.cjs");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const chatExtraction_1 = require("../../utils/chatExtraction.cjs");
const TABS_STATE_CONFIG_NAME = 'tabs-state';
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function normalizeTabState(rawTab, index, seenIds) {
    if (!isRecord(rawTab)) {
        return null;
    }
    const rawId = typeof rawTab.id === 'string' ? rawTab.id.trim() : '';
    const id = rawId || (0, node_crypto_1.randomUUID)();
    if (seenIds.has(id)) {
        return null;
    }
    seenIds.add(id);
    const rawTitle = typeof rawTab.title === 'string' ? rawTab.title.trim() : '';
    const title = rawTitle || 'New Chat';
    const createdAt = typeof rawTab.createdAt === 'number' && Number.isFinite(rawTab.createdAt)
        ? rawTab.createdAt
        : Date.now() + index;
    return {
        id,
        title,
        url: urls_1.GEMINI_APP_URL,
        createdAt,
    };
}
function normalizeTabsState(rawState) {
    if (!isRecord(rawState)) {
        return null;
    }
    const rawTabs = Array.isArray(rawState.tabs) ? rawState.tabs : [];
    const seenIds = new Set();
    const tabs = [];
    for (const [index, rawTab] of rawTabs.entries()) {
        const normalizedTab = normalizeTabState(rawTab, index, seenIds);
        if (normalizedTab) {
            tabs.push(normalizedTab);
        }
    }
    if (tabs.length === 0) {
        return null;
    }
    const firstTab = tabs[0];
    if (!firstTab) {
        return null;
    }
    const rawActiveTabId = typeof rawState.activeTabId === 'string' ? rawState.activeTabId : '';
    const activeTabId = seenIds.has(rawActiveTabId) ? rawActiveTabId : firstTab.id;
    return {
        tabs,
        activeTabId,
    };
}
function createDefaultTabsState() {
    const tabId = (0, node_crypto_1.randomUUID)();
    return {
        tabs: [
            {
                id: tabId,
                title: 'New Chat',
                url: urls_1.GEMINI_APP_URL,
                createdAt: Date.now(),
            },
        ],
        activeTabId: tabId,
    };
}
class TabStateIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    tabsStore;
    titlePollInterval = null;
    static TITLE_POLL_INTERVAL_MS = 3000;
    static RELOAD_COOLDOWN_MS = 1000;
    static RELOAD_TITLE_SYNC_DELAY_MS = 5000;
    lastReloadAt = 0;
    delayedTitlePollTimeout = null;
    constructor(...args) {
        super(...args);
        this.tabsStore = new store_1.default({
            configName: TABS_STATE_CONFIG_NAME,
            defaults: {
                tabsState: null,
            },
        });
    }
    register() {
        electron_1.ipcMain.handle(constants_1.IPC_CHANNELS.TABS_GET_STATE, () => this._handleGetState());
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.TABS_SAVE_STATE, (_event, state) => {
            this._handleSaveState(state);
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.TABS_UPDATE_TITLE, (_event, payload) => {
            this._handleUpdateTitle(payload);
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.TABS_RELOAD, (_event, payload) => {
            this._reloadActiveTabFrame(payload);
        });
        this.titlePollInterval = setInterval(() => {
            void this._pollForTitleUpdate();
        }, TabStateIpcHandler.TITLE_POLL_INTERVAL_MS);
    }
    updateTabTitle(tabId, title) {
        this._handleUpdateTitle({ tabId, title });
    }
    reloadActiveTabFromMenu() {
        this._reloadActiveTabFrame(undefined);
    }
    _handleGetState() {
        try {
            const storedState = this.tabsStore.get('tabsState');
            if (storedState === null || storedState === undefined) {
                return null;
            }
            const normalizedState = normalizeTabsState(storedState);
            if (normalizedState) {
                return normalizedState;
            }
            const fallbackState = createDefaultTabsState();
            this.tabsStore.set('tabsState', fallbackState);
            return fallbackState;
        }
        catch (error) {
            this.handleError('getting tab state', error);
            return createDefaultTabsState();
        }
    }
    _handleSaveState(state) {
        try {
            const normalizedState = normalizeTabsState(state) ?? createDefaultTabsState();
            this.tabsStore.set('tabsState', normalizedState);
        }
        catch (error) {
            this.handleError('saving tab state', error);
        }
    }
    _handleUpdateTitle(payload) {
        try {
            if (!isRecord(payload)) {
                return;
            }
            const rawTabId = typeof payload.tabId === 'string' ? payload.tabId.trim() : '';
            const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
            if (!rawTabId || !rawTitle) {
                return;
            }
            const storedState = this.tabsStore.get('tabsState');
            const normalizedState = normalizeTabsState(storedState);
            if (!normalizedState) {
                return;
            }
            let updated = false;
            const nextTabs = normalizedState.tabs.map((tab) => {
                if (tab.id !== rawTabId || tab.title === rawTitle) {
                    return tab;
                }
                updated = true;
                return {
                    ...tab,
                    title: rawTitle,
                };
            });
            if (!updated) {
                return;
            }
            const nextState = {
                tabs: nextTabs,
                activeTabId: normalizedState.activeTabId,
            };
            this.tabsStore.set('tabsState', nextState);
            this.broadcastToAllWindows(constants_1.IPC_CHANNELS.TABS_TITLE_UPDATED, { tabId: rawTabId, title: rawTitle });
        }
        catch (error) {
            this.handleError('updating tab title', error);
        }
    }
    async _pollForTitleUpdate() {
        try {
            const mainWindow = this.deps.windowManager.getMainWindow();
            if (!mainWindow || mainWindow.isDestroyed()) {
                this.logger.warn('Cannot sync tab title: main window not found or destroyed');
                return;
            }
            const storedState = this.tabsStore.get('tabsState');
            const normalizedState = normalizeTabsState(storedState);
            if (!normalizedState) {
                return;
            }
            const activeTabId = normalizedState.activeTabId;
            const targetFrameName = (0, tabs_1.getTabFrameName)(activeTabId);
            const frames = mainWindow.webContents.mainFrame.frames;
            const targetFrame = frames.find((frame) => frame.name === targetFrameName);
            if (!targetFrame) {
                this.logger.warn('Cannot sync tab title: active tab frame not found', {
                    activeTabId,
                    targetFrameName,
                    frameCount: frames.length,
                });
                return;
            }
            if (!(0, constants_1.isGeminiDomain)(targetFrame.url)) {
                this.logger.warn('Cannot sync tab title: active tab frame is not Gemini domain', {
                    activeTabId,
                    url: targetFrame.url,
                });
                return;
            }
            const rawTitle = (await targetFrame.executeJavaScript(chatExtraction_1.TITLE_EXTRACTION_SCRIPT));
            const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
            if (!title) {
                this._handleUpdateTitle({ tabId: activeTabId, title: 'New Chat' });
                return;
            }
            this._handleUpdateTitle({ tabId: activeTabId, title });
        }
        catch (error) {
            this.handleError('syncing tab title', error);
        }
    }
    _resolveActiveTabId(payload) {
        if (isRecord(payload)) {
            const payloadActiveTabId = typeof payload.activeTabId === 'string' ? payload.activeTabId.trim() : '';
            if (payloadActiveTabId) {
                return { activeTabId: payloadActiveTabId, source: 'payload' };
            }
        }
        const storedState = this.tabsStore.get('tabsState');
        const normalizedState = normalizeTabsState(storedState);
        if (!normalizedState) {
            return null;
        }
        return { activeTabId: normalizedState.activeTabId, source: 'store' };
    }
    _resolveFallbackFrameActiveTabId() {
        const mainWindow = this.deps.windowManager.getMainWindow();
        if (!mainWindow || mainWindow.isDestroyed()) {
            return null;
        }
        const activeGeminiFrame = mainWindow.webContents.mainFrame.frames.find((frame) => !frame.isDestroyed() && (0, constants_1.isGeminiDomain)(frame.url));
        if (!activeGeminiFrame) {
            return null;
        }
        const match = /^gemini-tab-(.+)$/.exec(activeGeminiFrame.name);
        const derivedTabId = match?.[1]?.trim();
        return derivedTabId || null;
    }
    _scheduleDelayedTitlePoll() {
        if (this.delayedTitlePollTimeout) {
            clearTimeout(this.delayedTitlePollTimeout);
        }
        this.delayedTitlePollTimeout = setTimeout(() => {
            this.delayedTitlePollTimeout = null;
            void this._pollForTitleUpdate();
        }, TabStateIpcHandler.RELOAD_TITLE_SYNC_DELAY_MS);
    }
    _reloadActiveTabFrame(payload) {
        try {
            const mainWindow = this.deps.windowManager.getMainWindow();
            if (!mainWindow || mainWindow.isDestroyed()) {
                this.logger.warn('Cannot reload active tab: main window not found or destroyed');
                return;
            }
            const now = Date.now();
            if (now - this.lastReloadAt < TabStateIpcHandler.RELOAD_COOLDOWN_MS) {
                this.logger.warn('Skipping tab reload due to cooldown', {
                    cooldownMs: TabStateIpcHandler.RELOAD_COOLDOWN_MS,
                });
                return;
            }
            const activeTabDetails = this._resolveActiveTabId(payload);
            let activeTabId;
            let source;
            if (activeTabDetails) {
                activeTabId = activeTabDetails.activeTabId;
                source = activeTabDetails.source;
            }
            else {
                const fallbackFrameTabId = this._resolveFallbackFrameActiveTabId();
                if (!fallbackFrameTabId) {
                    this.logger.warn('Cannot reload active tab: no active tab id available');
                    return;
                }
                activeTabId = fallbackFrameTabId;
                source = 'frame';
            }
            const targetFrameName = (0, tabs_1.getTabFrameName)(activeTabId);
            const targetFrame = mainWindow.webContents.mainFrame.frames.find((frame) => frame.name === targetFrameName);
            if (!targetFrame || targetFrame.isDestroyed()) {
                this.logger.warn('Cannot reload active tab: target frame missing or destroyed', {
                    activeTabId,
                    targetFrameName,
                    source,
                });
                return;
            }
            const reloadStarted = targetFrame.reload();
            this.lastReloadAt = now;
            this.logger.log('Active tab reload requested', {
                activeTabId,
                source,
                targetFrameName,
                reloadStarted,
            });
            this._scheduleDelayedTitlePoll();
        }
        catch (error) {
            this.handleError('reloading active tab frame', error);
        }
    }
    unregister() {
        electron_1.ipcMain.removeHandler(constants_1.IPC_CHANNELS.TABS_GET_STATE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.TABS_SAVE_STATE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.TABS_UPDATE_TITLE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.TABS_RELOAD);
        if (this.titlePollInterval) {
            clearInterval(this.titlePollInterval);
            this.titlePollInterval = null;
        }
        if (this.delayedTitlePollTimeout) {
            clearTimeout(this.delayedTitlePollTimeout);
            this.delayedTitlePollTimeout = null;
        }
    }
}
exports.TabStateIpcHandler = TabStateIpcHandler;
