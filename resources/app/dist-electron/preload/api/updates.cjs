"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatesAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.updatesAPI = {
    getAutoUpdateEnabled: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED),
    setAutoUpdateEnabled: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, enabled),
    checkForUpdates: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECK),
    installUpdate: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_INSTALL),
    onUpdateAvailable: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_AVAILABLE),
    onUpdateDownloaded: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED),
    onUpdateError: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR),
    onManualUpdateAvailable: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_MANUAL_UPDATE_AVAILABLE),
    onUpdateNotAvailable: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE),
    onDownloadProgress: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS),
    onCheckingForUpdate: (0, createSubscription_1.createSignalSubscription)(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECKING),
    getLastUpdateCheckTime: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK),
};
