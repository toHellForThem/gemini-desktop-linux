"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
exports.exportAPI = {
    exportChatToPdf: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_PDF),
    exportChatToMarkdown: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_MARKDOWN),
};
