"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
exports.notificationsAPI = {
    getResponseNotificationsEnabled: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED),
    setResponseNotificationsEnabled: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED, enabled),
};
