"use strict";
/**
 * Sandbox Initialization (Side-Effect Module)
 *
 * This module MUST be imported FIRST in main.ts — before any module that
 * reads BASE_WEB_PREFERENCES. It detects Linux AppImage sandbox restrictions
 * and sets the 'no-sandbox' command line switch synchronously at import time.
 *
 * ES import statements are hoisted, so inline code in main.ts would run AFTER
 * all imports have been evaluated. By placing detection in a separate module
 * imported first, we guarantee it executes before constants.ts evaluates.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sandboxDetector_1 = require("./sandboxDetector.cjs");
if ((0, sandboxDetector_1.shouldDisableSandbox)()) {
    electron_1.app.commandLine.appendSwitch('no-sandbox');
}
// Reduce automation fingerprinting (navigator.webdriver) for Google sign-in.
electron_1.app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
if (process.platform === 'linux') {
    try {
        const settingsPath = path.join(electron_1.app.getPath('userData'), 'settings.json');
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(raw);
        if (settings?.textPredictionEnabled === true) {
            electron_1.app.commandLine.appendSwitch('js-flags', '--no-v8-sandbox');
        }
    }
    catch (error) {
        const err = error;
        if (err?.code !== 'ENOENT' && process.env.NODE_ENV !== 'test') {
            console.warn('[sandboxInit] Failed to read or parse settings.json; V8 sandbox may not be disabled as expected.', err);
        }
    }
}
if (process.platform === 'linux' && process.argv.includes('--test-text-prediction')) {
    electron_1.app.commandLine.appendSwitch('js-flags', '--no-v8-sandbox');
}
