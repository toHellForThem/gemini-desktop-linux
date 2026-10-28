"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textPredictionAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.textPredictionAPI = {
    getTextPredictionEnabled: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED),
    setTextPredictionEnabled: (enabled) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED, enabled),
    getTextPredictionGpuEnabled: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_GET_GPU_ENABLED),
    setTextPredictionGpuEnabled: (enabled) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED, enabled),
    getTextPredictionStatus: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS),
    onTextPredictionStatusChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_STATUS_CHANGED),
    onTextPredictionDownloadProgress: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_DOWNLOAD_PROGRESS),
    predictText: (partialText) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TEXT_PREDICTION_PREDICT, partialText),
};
