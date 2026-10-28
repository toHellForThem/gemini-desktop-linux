"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotkeysAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.hotkeysAPI = {
    getIndividualHotkeys: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET),
    setIndividualHotkey: (id, enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, id, enabled),
    onIndividualHotkeysChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED),
    getHotkeyAccelerators: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET),
    getFullHotkeySettings: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET),
    setHotkeyAccelerator: (id, accelerator) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET, id, accelerator),
    onHotkeyAcceleratorsChanged: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED),
};
