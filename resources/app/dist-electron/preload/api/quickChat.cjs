"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickChatAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.quickChatAPI = {
    submitQuickChat: (text) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_SUBMIT, text),
    hideQuickChat: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_HIDE),
    cancelQuickChat: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_CANCEL),
    onQuickChatExecute: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.QUICK_CHAT_EXECUTE),
};
