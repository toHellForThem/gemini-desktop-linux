"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devTestingAPI = void 0;
const electron_1 = require("electron");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
const TEST_ONLY_DBUS_SIGNALS_ENABLED = process.env.NODE_ENV === 'test' || process.env.DEBUG_DBUS === '1';
exports.devTestingAPI = {
    devShowBadge: (version) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_SHOW_BADGE, version),
    devClearBadge: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_CLEAR_BADGE),
    devSetUpdateEnabled: (enabled) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, enabled),
    devEmitUpdateEvent: (event, data) => {
        const safeData = data instanceof Error
            ? {
                name: data.name,
                message: data.message,
            }
            : data;
        electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, event, safeData);
    },
    devMockPlatform: (platform, env) => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM, platform, env),
    devTriggerResponseNotification: () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION),
    getDbusActivationSignalStats: TEST_ONLY_DBUS_SIGNALS_ENABLED
        ? () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_STATS_GET)
        : () => Promise.resolve({
            trackingEnabled: false,
            totalSignals: 0,
            signalsByShortcut: {},
            lastSignalTime: null,
            signals: Object.freeze([]),
        }),
    clearDbusActivationSignalHistory: TEST_ONLY_DBUS_SIGNALS_ENABLED
        ? () => electron_1.ipcRenderer.send(ipc_channels_1.IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_HISTORY_CLEAR)
        : () => { },
    getTrayTooltip: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.TRAY_GET_TOOLTIP),
    onDebugTriggerError: (0, createSubscription_1.createSignalSubscription)(ipc_channels_1.IPC_CHANNELS.DEBUG_TRIGGER_ERROR),
};
