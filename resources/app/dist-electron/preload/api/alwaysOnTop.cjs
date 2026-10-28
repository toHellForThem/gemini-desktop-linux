"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alwaysOnTopAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.alwaysOnTopAPI = {
    getAlwaysOnTop: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ALWAYS_ON_TOP_GET),
    setAlwaysOnTop: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.ALWAYS_ON_TOP_SET, enabled),
    onAlwaysOnTopChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED),
};
