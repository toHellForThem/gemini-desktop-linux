"use strict";
/**
 * Hotkey Types
 *
 * Shared types for hotkey management across main and renderer processes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ACCELERATORS = exports.HOTKEY_SCOPE_MAP = exports.APPLICATION_HOTKEY_IDS = exports.GLOBAL_HOTKEY_IDS = exports.HOTKEY_IDS = void 0;
exports.getHotkeyScope = getHotkeyScope;
exports.isGlobalHotkey = isGlobalHotkey;
exports.isApplicationHotkey = isApplicationHotkey;
/**
 * All valid hotkey IDs as an array for iteration and validation.
 */
exports.HOTKEY_IDS = ['alwaysOnTop', 'peekAndHide', 'quickChat', 'printToPdf', 'voiceChat'];
/**
 * Hotkeys that work system-wide via Electron's globalShortcut API.
 * These work even when the application is not focused.
 */
exports.GLOBAL_HOTKEY_IDS = ['quickChat', 'peekAndHide', 'voiceChat'];
/**
 * Hotkeys that work only when the application window is focused.
 * These are registered via Menu accelerators.
 */
exports.APPLICATION_HOTKEY_IDS = ['alwaysOnTop', 'printToPdf'];
/**
 * Maps each hotkey ID to its scope.
 */
exports.HOTKEY_SCOPE_MAP = {
    quickChat: 'global',
    peekAndHide: 'global',
    voiceChat: 'global',
    alwaysOnTop: 'application',
    printToPdf: 'application',
};
/**
 * Get the scope of a hotkey.
 * @param id - The hotkey identifier
 * @returns The scope ('global' or 'application')
 */
function getHotkeyScope(id) {
    return exports.HOTKEY_SCOPE_MAP[id];
}
/**
 * Check if a hotkey is a global hotkey (works system-wide).
 * @param id - The hotkey identifier
 * @returns True if the hotkey is global
 */
function isGlobalHotkey(id) {
    return exports.HOTKEY_SCOPE_MAP[id] === 'global';
}
/**
 * Check if a hotkey is an application hotkey (works only when app focused).
 * @param id - The hotkey identifier
 * @returns True if the hotkey is application-scoped
 */
function isApplicationHotkey(id) {
    return exports.HOTKEY_SCOPE_MAP[id] === 'application';
}
/**
 * Default accelerators for each hotkey.
 * Used when no custom accelerator is configured.
 */
exports.DEFAULT_ACCELERATORS = {
    // Ctrl+Alt+P = Pin window (always on top)
    // Note: Ctrl+Alt+T conflicts with GNOME terminal shortcut
    alwaysOnTop: 'CommandOrControl+Alt+P',
    peekAndHide: 'CommandOrControl+Shift+Space',
    // Ctrl+Shift+Alt+Space = Quick Chat toggle
    quickChat: 'CommandOrControl+Shift+Alt+Space',
    // Ctrl+Shift+M = Voice Chat toggle
    voiceChat: 'CommandOrControl+Shift+M',
    // Ctrl+Shift+P = Print to PDF
    printToPdf: 'CommandOrControl+Shift+P',
};
