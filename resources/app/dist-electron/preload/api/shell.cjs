"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shellAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
exports.shellAPI = {
    revealInFolder: (path) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.SHELL_SHOW_ITEM_IN_FOLDER, path),
};
