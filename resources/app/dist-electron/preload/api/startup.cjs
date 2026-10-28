"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startupAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
exports.startupAPI = {
    getLaunchAtStartup: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_GET),
    setLaunchAtStartup: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.LAUNCH_AT_STARTUP_SET, enabled),
    getStartMinimized: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.START_MINIMIZED_GET),
    setStartMinimized: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.START_MINIMIZED_SET, enabled),
};
