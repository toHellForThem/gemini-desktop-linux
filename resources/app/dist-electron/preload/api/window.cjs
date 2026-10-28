"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.windowAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.windowAPI = {
    minimizeWindow: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_MINIMIZE),
    maximizeWindow: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_MAXIMIZE),
    closeWindow: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_CLOSE),
    showWindow: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.WINDOW_SHOW),
    isMaximized: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    isFullscreen: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.WINDOW_IS_FULLSCREEN),
    toggleFullscreen: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.FULLSCREEN_TOGGLE),
    onFullscreenChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.FULLSCREEN_CHANGED),
    openOptions: (tab) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.OPEN_OPTIONS, tab),
    openGoogleSignIn: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.OPEN_GOOGLE_SIGNIN),
    restartApp: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.APP_RESTART),
    quitApp: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.APP_QUIT),
};
