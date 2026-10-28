"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toastAPI = void 0;
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const createSubscription_1 = require("../createSubscription.cjs");
exports.toastAPI = {
    onToastShow: (0, createSubscription_1.createSubscription)(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW),
};
