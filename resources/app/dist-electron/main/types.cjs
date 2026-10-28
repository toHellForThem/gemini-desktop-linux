"use strict";
/**
 * Shared TypeScript type definitions for Electron application.
 *
 * This file re-exports shared types and defines main-process-specific types.
 * For new code, consider importing directly from '@shared/types' instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApplicationHotkey = exports.isGlobalHotkey = exports.getHotkeyScope = exports.HOTKEY_SCOPE_MAP = exports.APPLICATION_HOTKEY_IDS = exports.GLOBAL_HOTKEY_IDS = exports.HOTKEY_IDS = exports.DEFAULT_ACCELERATORS = void 0;
// Re-export hotkey constants and scope helpers
var hotkeys_1 = require("../shared/types/hotkeys.cjs");
Object.defineProperty(exports, "DEFAULT_ACCELERATORS", { enumerable: true, get: function () { return hotkeys_1.DEFAULT_ACCELERATORS; } });
Object.defineProperty(exports, "HOTKEY_IDS", { enumerable: true, get: function () { return hotkeys_1.HOTKEY_IDS; } });
Object.defineProperty(exports, "GLOBAL_HOTKEY_IDS", { enumerable: true, get: function () { return hotkeys_1.GLOBAL_HOTKEY_IDS; } });
Object.defineProperty(exports, "APPLICATION_HOTKEY_IDS", { enumerable: true, get: function () { return hotkeys_1.APPLICATION_HOTKEY_IDS; } });
Object.defineProperty(exports, "HOTKEY_SCOPE_MAP", { enumerable: true, get: function () { return hotkeys_1.HOTKEY_SCOPE_MAP; } });
Object.defineProperty(exports, "getHotkeyScope", { enumerable: true, get: function () { return hotkeys_1.getHotkeyScope; } });
Object.defineProperty(exports, "isGlobalHotkey", { enumerable: true, get: function () { return hotkeys_1.isGlobalHotkey; } });
Object.defineProperty(exports, "isApplicationHotkey", { enumerable: true, get: function () { return hotkeys_1.isApplicationHotkey; } });
