"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.platformAPI = {
    platform: process.platform,
    isElectron: true,
    getPlatformHotkeyStatus: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.PLATFORM_HOTKEY_STATUS_GET),
    onPlatformHotkeyStatusChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.PLATFORM_HOTKEY_STATUS_CHANGED),
};
