"use strict";
/**
 * Window classes for Electron application.
 *
 * @module windows
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickChatWindow = exports.OptionsWindow = exports.AuthWindow = exports.MainWindow = exports.BaseWindow = void 0;
var baseWindow_1 = require("./baseWindow.cjs");
Object.defineProperty(exports, "BaseWindow", { enumerable: true, get: function () { return __importDefault(baseWindow_1).default; } });
var mainWindow_1 = require("./mainWindow.cjs");
Object.defineProperty(exports, "MainWindow", { enumerable: true, get: function () { return __importDefault(mainWindow_1).default; } });
var authWindow_1 = require("./authWindow.cjs");
Object.defineProperty(exports, "AuthWindow", { enumerable: true, get: function () { return __importDefault(authWindow_1).default; } });
var optionsWindow_1 = require("./optionsWindow.cjs");
Object.defineProperty(exports, "OptionsWindow", { enumerable: true, get: function () { return __importDefault(optionsWindow_1).default; } });
var quickChatWindow_1 = require("./quickChatWindow.cjs");
Object.defineProperty(exports, "QuickChatWindow", { enumerable: true, get: function () { return __importDefault(quickChatWindow_1).default; } });
