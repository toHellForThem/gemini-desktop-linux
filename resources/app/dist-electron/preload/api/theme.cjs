"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.themeAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.themeAPI = {
    getTheme: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.THEME_GET),
    setTheme: (theme) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.THEME_SET, theme),
    onThemeChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.THEME_CHANGED),
};
