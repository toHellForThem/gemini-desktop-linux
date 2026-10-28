"use strict";
/**
 * Platform Adapter Factory.
 *
 * Selects and caches the appropriate PlatformAdapter based on the current
 * platform and session type. The cached singleton ensures consistent
 * behavior across the application lifetime.
 *
 * @module PlatformAdapterFactory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformAdapter = getPlatformAdapter;
exports.resetPlatformAdapterForTests = resetPlatformAdapterForTests;
const constants_1 = require("../utils/constants.cjs");
const LinuxWaylandAdapter_1 = require("./adapters/LinuxWaylandAdapter.cjs");
const LinuxX11Adapter_1 = require("./adapters/LinuxX11Adapter.cjs");
const WindowsAdapter_1 = require("./adapters/WindowsAdapter.cjs");
const MacAdapter_1 = require("./adapters/MacAdapter.cjs");
/** Cached adapter singleton */
let _cachedAdapter = null;
/**
 * Get the platform adapter for the current environment.
 *
 * Selection logic:
 * - Linux + Wayland session → LinuxWaylandAdapter
 * - Linux + X11 session    → LinuxX11Adapter
 * - Windows (win32)        → WindowsAdapter
 * - macOS (darwin)          → MacAdapter
 *
 * The adapter is cached after first creation.
 *
 * @returns The platform adapter singleton
 */
function getPlatformAdapter() {
    if (_cachedAdapter) {
        return _cachedAdapter;
    }
    if (constants_1.isLinux) {
        _cachedAdapter = constants_1.isWayland ? new LinuxWaylandAdapter_1.LinuxWaylandAdapter() : new LinuxX11Adapter_1.LinuxX11Adapter();
    }
    else if (process.platform === 'win32') {
        _cachedAdapter = new WindowsAdapter_1.WindowsAdapter();
    }
    else if (process.platform === 'darwin') {
        _cachedAdapter = new MacAdapter_1.MacAdapter();
    }
    else {
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
    return _cachedAdapter;
}
/**
 * Clear the cached adapter. **Test-only** — use to reset state between tests.
 */
function resetPlatformAdapterForTests() {
    _cachedAdapter = null;
}
