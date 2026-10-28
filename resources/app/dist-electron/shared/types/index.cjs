"use strict";
/**
 * Shared Types
 *
 * Barrel export for all shared type definitions that are used across
 * main, renderer, and preload processes.
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
// Export all type modules
__exportStar(require("./theme.cjs"), exports);
__exportStar(require("./hotkeys.cjs"), exports);
__exportStar(require("./updates.cjs"), exports);
__exportStar(require("./ipc.cjs"), exports);
__exportStar(require("./toast.cjs"), exports);
__exportStar(require("./text-prediction.cjs"), exports);
__exportStar(require("./notifications.cjs"), exports);
__exportStar(require("./tabs.cjs"), exports);
// Note: Global Window augmentation is handled in src/main/types.ts for backward compatibility
