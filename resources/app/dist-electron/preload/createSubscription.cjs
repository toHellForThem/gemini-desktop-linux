"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscription = createSubscription;
exports.createSignalSubscription = createSignalSubscription;
const electron_1 = require("electron");
function createSubscription(channel) {
    return (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on(channel, handler);
        return () => {
            electron_1.ipcRenderer.removeListener(channel, handler);
        };
    };
}
function createSignalSubscription(channel) {
    return (callback) => {
        const handler = () => callback();
        electron_1.ipcRenderer.on(channel, handler);
        return () => {
            electron_1.ipcRenderer.removeListener(channel, handler);
        };
    };
}
