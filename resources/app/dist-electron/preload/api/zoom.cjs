"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoomAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.zoomAPI = {
    getZoomLevel: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ZOOM_GET_LEVEL),
    zoomIn: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ZOOM_IN),
    zoomOut: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.ZOOM_OUT),
    onZoomLevelChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.ZOOM_LEVEL_CHANGED),
};
