"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartEnterAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
exports.smartEnterAPI = {
    getSmartEnterEnabled: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.SMART_ENTER_GET_ENABLED),
    setSmartEnterEnabled: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.SMART_ENTER_SET_ENABLED, enabled),
    getScrollToBottomButtonEnabled: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED),
    setScrollToBottomButtonEnabled: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED, enabled),
};
