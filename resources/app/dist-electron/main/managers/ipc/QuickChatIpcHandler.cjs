"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickChatIpcHandler = void 0;
const node_crypto_1 = require("node:crypto");
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const constants_1 = require("../../utils/constants.cjs");
const tabs_1 = require("../../../shared/types/tabs.cjs");
const injectionScript_1 = require("../../utils/injectionScript.cjs");
const REQUEST_TTL_MS = 2 * 60 * 1000;
function isGeminiReadyPayload(payload) {
    if (typeof payload !== 'object' || payload === null) {
        return false;
    }
    const candidate = payload;
    return (typeof candidate.requestId === 'string' &&
        candidate.requestId.trim().length > 0 &&
        typeof candidate.targetTabId === 'string' &&
        candidate.targetTabId.trim().length > 0);
}
class QuickChatIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    pendingRequests = new Map();
    latestRequestByTab = new Map();
    _clearLatestRequestByTabIfMatches(tabId, requestId) {
        const latestRequestId = this.latestRequestByTab.get(tabId);
        if (latestRequestId === requestId) {
            this.latestRequestByTab.delete(tabId);
        }
    }
    register() {
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.QUICK_CHAT_SUBMIT, (_event, text) => {
            this._handleSubmit(text);
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.GEMINI_READY, async (_event, payload) => {
            await this._handleGeminiReady(payload);
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.QUICK_CHAT_HIDE, () => {
            this._handleHide();
        });
        electron_1.ipcMain.on(constants_1.IPC_CHANNELS.QUICK_CHAT_CANCEL, () => {
            this._handleCancel();
        });
    }
    _cleanupExpiredRequests() {
        const now = Date.now();
        for (const [requestId, request] of this.pendingRequests.entries()) {
            if (now - request.createdAt > REQUEST_TTL_MS) {
                this.pendingRequests.delete(requestId);
                this._clearLatestRequestByTabIfMatches(request.targetTabId, requestId);
            }
        }
    }
    _handleSubmit(text) {
        try {
            this._cleanupExpiredRequests();
            this.logger.log('Quick Chat submit received:', text.substring(0, 50));
            this.deps.windowManager.hideQuickChat();
            this.deps.windowManager.focusMainWindow();
            const mainWindow = this.deps.windowManager.getMainWindow();
            if (!mainWindow) {
                this.logger.error('Cannot navigate: main window not found');
                return;
            }
            const requestId = (0, node_crypto_1.randomUUID)();
            const targetTabId = (0, node_crypto_1.randomUUID)();
            const request = {
                requestId,
                targetTabId,
                text,
                createdAt: Date.now(),
            };
            this.pendingRequests.set(requestId, request);
            this.latestRequestByTab.set(targetTabId, requestId);
            this.logger.log('Quick Chat navigation requested:', {
                requestId,
                targetTabId,
                activeTabId: mainWindow.webContents.id,
                windowId: mainWindow.id,
            });
            mainWindow.webContents.send(constants_1.IPC_CHANNELS.GEMINI_NAVIGATE, {
                requestId,
                targetTabId,
                text,
            });
        }
        catch (error) {
            this.handleError('handling quick chat submit', error);
        }
    }
    async _handleGeminiReady(payload) {
        try {
            this._cleanupExpiredRequests();
            if (!isGeminiReadyPayload(payload)) {
                this.logger.warn('Ignoring invalid gemini:ready payload');
                return;
            }
            const e2eBuffer = global.__e2eGeminiReadyBuffer;
            const shouldBuffer = process.argv.includes('--e2e-disable-auto-submit') && e2eBuffer?.enabled;
            this.logger.log('Gemini ready received:', payload);
            const request = this.pendingRequests.get(payload.requestId);
            if (!request) {
                this.logger.warn('Ignoring stale gemini:ready payload with unknown requestId');
                return;
            }
            if (request.targetTabId !== payload.targetTabId) {
                this.logger.warn('Ignoring gemini:ready payload with mismatched targetTabId');
                return;
            }
            const latestRequestId = this.latestRequestByTab.get(payload.targetTabId);
            if (latestRequestId !== payload.requestId) {
                this.logger.warn('Ignoring out-of-order gemini:ready payload for stale request');
                return;
            }
            if (shouldBuffer) {
                if (!Array.isArray(e2eBuffer?.pending)) {
                    if (e2eBuffer) {
                        e2eBuffer.pending = [];
                    }
                }
                e2eBuffer?.pending?.push(payload);
                this.logger.log('Buffered gemini:ready payload for E2E');
                return;
            }
            await this._injectTextIntoGeminiIframe(request);
            this.pendingRequests.delete(payload.requestId);
            this._clearLatestRequestByTabIfMatches(request.targetTabId, payload.requestId);
        }
        catch (error) {
            this.handleError('handling gemini ready', error);
        }
    }
    flushE2EBufferedReady() {
        try {
            const e2eBuffer = global.__e2eGeminiReadyBuffer;
            if (!process.argv.includes('--e2e-disable-auto-submit') || !e2eBuffer?.enabled) {
                return;
            }
            const pending = Array.isArray(e2eBuffer.pending) ? [...e2eBuffer.pending] : [];
            e2eBuffer.pending = [];
            e2eBuffer.enabled = false;
            for (const payload of pending) {
                void this._handleGeminiReady(payload);
            }
            e2eBuffer.enabled = true;
        }
        catch (error) {
            this.handleError('flushing E2E gemini ready buffer', error);
        }
    }
    _handleHide() {
        try {
            this.deps.windowManager.hideQuickChat();
        }
        catch (error) {
            this.handleError('hiding quick chat', error);
        }
    }
    _handleCancel() {
        try {
            this.deps.windowManager.hideQuickChat();
            this.logger.log('Quick Chat cancelled');
        }
        catch (error) {
            this.handleError('cancelling quick chat', error);
        }
    }
    async _injectTextIntoGeminiIframe(request) {
        const mainWindow = this.deps.windowManager.getMainWindow();
        if (!mainWindow) {
            this.logger.error('Cannot inject text: main window not found');
            return;
        }
        const frameName = (0, tabs_1.getTabFrameName)(request.targetTabId);
        const frames = mainWindow.webContents.mainFrame.frames;
        const targetFrame = frames.find((frame) => frame.name === frameName);
        this.logger.log('Quick Chat injection lookup:', {
            requestId: request.requestId,
            targetTabId: request.targetTabId,
            frameName,
            framesCount: frames.length,
            frameNames: frames.map((frame) => frame.name),
        });
        if (!targetFrame) {
            this.logger.error('Cannot inject text: target tab frame not found');
            return;
        }
        if (!(0, constants_1.isGeminiDomain)(targetFrame.url)) {
            this.logger.error('Cannot inject text: target frame URL is not Gemini domain');
            return;
        }
        const isE2EMode = process.argv.includes('--e2e-disable-auto-submit');
        const injectionScript = new injectionScript_1.InjectionScriptBuilder().withText(request.text).withAutoSubmit(!isE2EMode).build();
        try {
            const result = (await targetFrame.executeJavaScript(injectionScript));
            if (result?.success) {
                this.logger.log('Text injected into Gemini successfully');
            }
            else {
                this.logger.error('Injection script returned failure:', {
                    error: result?.error,
                    details: result?.details,
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to inject text into Gemini:', error);
        }
    }
    unregister() {
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.QUICK_CHAT_SUBMIT);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.GEMINI_READY);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.QUICK_CHAT_HIDE);
        electron_1.ipcMain.removeAllListeners(constants_1.IPC_CHANNELS.QUICK_CHAT_CANCEL);
        this.pendingRequests.clear();
        this.latestRequestByTab.clear();
    }
}
exports.QuickChatIpcHandler = QuickChatIpcHandler;
