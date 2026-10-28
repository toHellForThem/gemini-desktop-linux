"use strict";
/**
 * Electron utility modules barrel export.
 * Centralizes all utility exports for cleaner imports.
 *
 * @module electron/utils
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showToast = exports.setupHeaderStripping = exports.getIconPath = exports.getDistHtmlPath = exports.getPreloadPath = exports.createLogger = void 0;
__exportStar(require("./constants.cjs"), exports);
var logger_1 = require("./logger.cjs");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
var paths_1 = require("./paths.cjs");
Object.defineProperty(exports, "getPreloadPath", { enumerable: true, get: function () { return paths_1.getPreloadPath; } });
Object.defineProperty(exports, "getDistHtmlPath", { enumerable: true, get: function () { return paths_1.getDistHtmlPath; } });
Object.defineProperty(exports, "getIconPath", { enumerable: true, get: function () { return paths_1.getIconPath; } });
var security_1 = require("./security.cjs");
Object.defineProperty(exports, "setupHeaderStripping", { enumerable: true, get: function () { return security_1.setupHeaderStripping; } });
__exportStar(require("./injectionScript.cjs"), exports);
var toast_1 = require("./toast.cjs");
Object.defineProperty(exports, "showToast", { enumerable: true, get: function () { return toast_1.showToast; } });
