"use strict";
/**
 * D-Bus Fallback Module for Wayland Global Shortcuts.
 *
 * This module provides a fallback mechanism for registering global shortcuts
 * on Wayland systems using the XDG Desktop Portal GlobalShortcuts interface.
 * It communicates via D-Bus using the `dbus-next` library.
 *
 * ## Key Design Decisions:
 * - **Dynamic import**: `dbus-next` is imported dynamically to avoid loading
 *   it on systems where it's not needed (Windows, macOS, X11)
 * - **Single session**: One portal session handles all shortcuts
 * - **Batch binding**: All shortcuts are bound in a single BindShortcuts call
 * - **Low-level signal handling**: Uses bus-level message listeners for
 *   reliable signal reception (portal Response and Activated signals)
 * - **XDG accelerator format**: Converts Electron accelerators to XDG spec
 *   format (CTRL+ALT+key) for KDE compatibility
 * - **Error containment**: All D-Bus errors are caught and never thrown
 *
 * @module DBusFallback
 * @see https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html
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
exports.electronAcceleratorToXdg = electronAcceleratorToXdg;
exports.getActivationSignalStats = getActivationSignalStats;
exports.clearActivationSignalHistory = clearActivationSignalHistory;
exports.isDBusFallbackAvailable = isDBusFallbackAvailable;
exports.registerViaDBus = registerViaDBus;
exports.destroySession = destroySession;
const logger_1 = require("./logger.cjs");
const sandboxDetector_1 = require("./sandboxDetector.cjs");
const logger = (0, logger_1.createLogger)('[DBusFallback]');
// ============================================================================
// Constants
// ============================================================================
/** Whether to enable verbose D-Bus debug logging (heartbeat, message body dumps) */
const DEBUG_DBUS = process.env.DEBUG_DBUS === '1' || process.env.DEBUG_DBUS === 'true';
const PORTAL_BUS_NAME = 'org.freedesktop.portal.Desktop';
const PORTAL_OBJECT_PATH = '/org/freedesktop/portal/desktop';
const GLOBAL_SHORTCUTS_INTERFACE = 'org.freedesktop.portal.GlobalShortcuts';
/** D-Bus signal message type constant */
const DBUS_MESSAGE_TYPE_SIGNAL = 4;
/** Heartbeat interval (ms) for D-Bus connection logging */
const HEARTBEAT_INTERVAL_MS = 5000;
/**
 * Timeout (ms) for portal Response signals.
 *
 * BindShortcuts on KDE Plasma 6 may show a user-approval dialog.
 * We use a generous timeout but don't block forever — the app should
 * remain functional even if the user dismisses or ignores the dialog.
 */
const RESPONSE_TIMEOUT_MS = 30_000;
// ============================================================================
// XDG Accelerator Format Conversion
// ============================================================================
/**
 * Map of Electron modifier names to XDG Desktop Portal modifier names.
 *
 * XDG spec modifiers (from xkbcommon-names.h):
 *   CTRL, ALT, SHIFT, NUM, LOGO
 *
 * @see https://specifications.freedesktop.org/shortcuts-spec/latest/
 */
const ELECTRON_TO_XDG_MODIFIERS = {
    commandorcontrol: 'CTRL',
    cmdorctrl: 'CTRL',
    control: 'CTRL',
    ctrl: 'CTRL',
    command: 'LOGO',
    cmd: 'LOGO',
    alt: 'ALT',
    option: 'ALT',
    altgr: 'ALT',
    shift: 'SHIFT',
    super: 'LOGO',
    meta: 'LOGO',
    num: 'NUM',
};
/**
 * Map of Electron key names to XKB keysym names.
 *
 * XDG spec keys use xkbcommon keysym names (without XKB_KEY_ prefix).
 * Most single-character keys are lowercase. Special keys have specific names.
 *
 * @see https://xkbcommon.org/doc/current/xkbcommon-keysyms_8h.html
 */
const ELECTRON_TO_XKB_KEYS = {
    space: 'space',
    tab: 'Tab',
    enter: 'Return',
    return: 'Return',
    escape: 'Escape',
    esc: 'Escape',
    backspace: 'BackSpace',
    delete: 'Delete',
    del: 'Delete',
    insert: 'Insert',
    ins: 'Insert',
    home: 'Home',
    end: 'End',
    pageup: 'Prior',
    pagedown: 'Next',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    printscreen: 'Print',
    capslock: 'Caps_Lock',
    numlock: 'Num_Lock',
    scrolllock: 'Scroll_Lock',
    volumeup: 'XF86AudioRaiseVolume',
    volumedown: 'XF86AudioLowerVolume',
    volumemute: 'XF86AudioMute',
    medianexttrack: 'XF86AudioNext',
    mediaprevioustrack: 'XF86AudioPrev',
    mediastop: 'XF86AudioStop',
    mediaplaypause: 'XF86AudioPlay',
    plus: 'plus',
    minus: 'minus',
    period: 'period',
    '.': 'period',
    ',': 'comma',
    '/': 'slash',
    '\\': 'backslash',
    '=': 'equal',
    '-': 'minus',
    '[': 'bracketleft',
    ']': 'bracketright',
    ';': 'semicolon',
    "'": 'apostrophe',
    '`': 'grave',
};
/**
 * Convert an Electron-format accelerator to the XDG Shortcuts Spec format.
 *
 * @example
 * electronAcceleratorToXdg('CommandOrControl+Shift+Space') // → 'CTRL+SHIFT+space'
 * electronAcceleratorToXdg('CommandOrControl+Alt+P')       // → 'CTRL+ALT+p'
 * electronAcceleratorToXdg('Ctrl+Shift+F12')               // → 'CTRL+SHIFT+F12'
 *
 * @param accelerator - Electron-format accelerator string
 * @returns XDG-format accelerator string
 */
function electronAcceleratorToXdg(accelerator) {
    const parts = accelerator.split('+');
    const xdgParts = [];
    for (const part of parts) {
        const lower = part.toLowerCase().trim();
        // Check if it's a modifier
        const xdgModifier = ELECTRON_TO_XDG_MODIFIERS[lower];
        if (xdgModifier) {
            xdgParts.push(xdgModifier);
            continue;
        }
        // Check if it's a special key with a known XKB mapping
        const xkbKey = ELECTRON_TO_XKB_KEYS[lower];
        if (xkbKey) {
            xdgParts.push(xkbKey);
            continue;
        }
        // Function keys: F1-F24 — keep as-is (uppercase)
        if (/^f\d{1,2}$/i.test(part)) {
            xdgParts.push(part.toUpperCase());
            continue;
        }
        // Single character keys: use lowercase
        if (part.length === 1) {
            xdgParts.push(part.toLowerCase());
            continue;
        }
        // Unknown key — pass through as-is
        logger.warn(`Unknown key in accelerator "${accelerator}": "${part}" — passing through`);
        xdgParts.push(part);
    }
    return xdgParts.join('+');
}
// ============================================================================
// Module State
// ============================================================================
/**
 * Current D-Bus connection.
 *
 * Held alive for the lifetime of the session to receive `Activated` signals.
 */
let connection = null;
/**
 * Current portal interface proxy.
 */
let portalInterface = null;
/**
 * Current session path.
 *
 * Used to identify the session when calling `BindShortcuts` or cleaning up.
 */
let sessionPath = null;
/**
 * Message handler for Activated signals — stored for cleanup.
 */
let activatedMessageHandler = null;
/**
 * Periodic heartbeat timer for D-Bus connection logging.
 */
let heartbeatTimer = null;
const testOnlyActivationSignals = [];
const TEST_ONLY_SIGNAL_TRACKING_ENABLED = process.env.NODE_ENV === 'test' || process.env.DEBUG_DBUS === '1';
const MAX_TEST_SIGNALS = 100; // Prevent unbounded growth in long-running tests
/**
 * Record an activation signal for test verification.
 * This is a no-op in production (guarded by NODE_ENV check).
 */
function recordTestOnlyActivationSignal(shortcutId, sessionPath) {
    if (!TEST_ONLY_SIGNAL_TRACKING_ENABLED)
        return;
    testOnlyActivationSignals.push({
        shortcutId,
        timestamp: Date.now(),
        sessionPath,
    });
    // Prevent unbounded growth
    if (testOnlyActivationSignals.length > MAX_TEST_SIGNALS) {
        testOnlyActivationSignals.shift();
    }
}
/**
 * Get statistics about observed activation signals.
 * @returns Test-only signal tracking data
 */
function getActivationSignalStats() {
    const signals = [...testOnlyActivationSignals];
    const signalsByShortcut = {};
    for (const signal of signals) {
        signalsByShortcut[signal.shortcutId] = (signalsByShortcut[signal.shortcutId] || 0) + 1;
    }
    return {
        trackingEnabled: TEST_ONLY_SIGNAL_TRACKING_ENABLED,
        totalSignals: signals.length,
        signalsByShortcut,
        lastSignalTime: signals.length > 0 ? (signals[signals.length - 1]?.timestamp ?? null) : null,
        signals: Object.freeze(signals),
    };
}
/**
 * Clear test-only activation signal history.
 * Useful for test isolation between test cases.
 */
function clearActivationSignalHistory() {
    if (!TEST_ONLY_SIGNAL_TRACKING_ENABLED)
        return;
    testOnlyActivationSignals.length = 0;
}
// ============================================================================
// Internal Helpers
// ============================================================================
/**
 * Wait for a portal Response signal on a request path.
 *
 * Portal methods (CreateSession, BindShortcuts, ListShortcuts) are
 * asynchronous — they return a request object path, and the actual result
 * arrives as a Response signal on that path. This function uses a low-level
 * bus message listener because request objects are ephemeral and can't be
 * introspected with `getProxyObject` before the method call creates them.
 *
 * @param bus - The D-Bus connection
 * @param requestPath - Expected request object path
 * @param timeoutMs - Maximum time to wait for the response
 * @returns The response code and results dict
 */
function waitForPortalResponse(bus, requestPath, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            bus.removeListener?.('message', handler);
            reject(new Error(`Portal Response timeout (${timeoutMs}ms) on ${requestPath}`));
        }, timeoutMs);
        function handler(msg) {
            if (msg.type === DBUS_MESSAGE_TYPE_SIGNAL &&
                msg.path === requestPath &&
                msg.interface === 'org.freedesktop.portal.Request' &&
                msg.member === 'Response') {
                clearTimeout(timeout);
                bus.removeListener?.('message', handler);
                const [responseCode, results] = (msg.body || []);
                resolve({ code: responseCode, results: results || {} });
            }
        }
        bus.on?.('message', handler);
    });
}
function parseShortcutSignalPayload(msg) {
    const body = msg.body;
    if (!Array.isArray(body) || body.length < 2) {
        logger.warn('Received malformed portal shortcut signal body', { member: msg.member, body });
        return null;
    }
    const shortcutId = body[1];
    if (typeof shortcutId !== 'string' || shortcutId.trim().length === 0) {
        logger.warn('Received portal shortcut signal with invalid shortcutId', {
            member: msg.member,
            shortcutId,
            body,
        });
        return null;
    }
    return { shortcutId };
}
// ============================================================================
// Public API
// ============================================================================
/**
 * Check whether the D-Bus GlobalShortcuts interface is available.
 *
 * This function dynamically imports `dbus-next` so the dependency is only
 * loaded when needed and doesn't crash platforms where it isn't installed.
 *
 * @returns `true` if the portal interface is available
 */
async function isDBusFallbackAvailable() {
    if ((0, sandboxDetector_1.isV8SandboxIncompatibleKernelForMainProcess)()) {
        logger.log('D-Bus fallback disabled on Linux kernel 7+ (V8 sandbox/usocket incompatibility) — skipping');
        return false;
    }
    try {
        const dbusNext = await Promise.resolve().then(() => __importStar(require('dbus-next')));
        const bus = dbusNext.sessionBus();
        try {
            const proxyObj = await bus.getProxyObject(PORTAL_BUS_NAME, PORTAL_OBJECT_PATH);
            const propsInterface = proxyObj.getInterface('org.freedesktop.DBus.Properties');
            // Use type assertion since Properties interface has Get method
            const ifaces = await propsInterface.Get('org.freedesktop.portal.Desktop', 'Interfaces');
            const available = Array.isArray(ifaces) && ifaces.includes(GLOBAL_SHORTCUTS_INTERFACE);
            logger.log(`D-Bus fallback available: ${available}`);
            return available;
        }
        finally {
            bus.disconnect();
        }
    }
    catch (error) {
        logger.log(`D-Bus fallback not available: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
/**
 * Register global shortcuts via the XDG Desktop Portal D-Bus interface.
 *
 * This function:
 * 1. Creates a portal session with proper Response signal handling
 * 2. Converts Electron accelerators to XDG spec format
 * 3. Binds shortcuts and waits for user approval (KDE shows a dialog)
 * 4. Sets up a bus-level Activated signal listener for shortcut activation
 *
 * @param shortcuts - Shortcut definitions to register
 * @param actionCallbacks - Optional map of HotkeyId to action callback functions
 * @returns Per-shortcut registration results
 */
async function registerViaDBus(shortcuts, actionCallbacks) {
    const callbackIds = actionCallbacks ? Array.from(actionCallbacks.keys()) : [];
    logger.log(`registerViaDBus called. shortcuts=${shortcuts.length}, actionCallbacks=${actionCallbacks ? 'provided' : 'missing'}${actionCallbacks ? ` (${callbackIds.join(', ') || 'none'})` : ''}`);
    // Early exit for empty array
    if (shortcuts.length === 0) {
        return [];
    }
    if ((0, sandboxDetector_1.isV8SandboxIncompatibleKernelForMainProcess)()) {
        logger.warn('D-Bus global shortcuts disabled on Linux kernel 7+ (V8 sandbox/usocket incompatibility) — skipping registration');
        return shortcuts.map((s) => ({
            hotkeyId: s.id,
            success: false,
            error: 'Global shortcuts are disabled on Linux kernel 7+ (V8 sandbox incompatibility).',
        }));
    }
    try {
        // Dynamically import dbus-next
        const dbusNext = await Promise.resolve().then(() => __importStar(require('dbus-next')));
        // Clean up any existing session first
        await destroySession();
        // Connect to session bus
        connection = dbusNext.sessionBus();
        logger.log('Connected to D-Bus session bus');
        if (process.env.NODE_ENV === 'test' && DEBUG_DBUS && !heartbeatTimer) {
            heartbeatTimer = setInterval(() => {
                logger.log('D-Bus heartbeat: session bus connection alive', {
                    name: connection?.name || '(unknown)',
                    sessionPath: sessionPath || '(unset)',
                });
            }, HEARTBEAT_INTERVAL_MS);
            heartbeatTimer.unref?.();
        }
        // Get portal proxy — this implicitly waits for the bus name assignment
        const proxyObj = await connection.getProxyObject(PORTAL_BUS_NAME, PORTAL_OBJECT_PATH);
        portalInterface = proxyObj.getInterface(GLOBAL_SHORTCUTS_INTERFACE);
        if (!portalInterface?.CreateSession || !portalInterface?.BindShortcuts) {
            throw new Error('GlobalShortcuts interface methods not available');
        }
        // Read sender name (available after getProxyObject completes the Hello handshake)
        const sender = connection.name?.replace(/^:/, '')?.replace(/\./g, '_') || '';
        if (!sender) {
            throw new Error('Could not determine D-Bus sender name — bus.name is null');
        }
        logger.log(`D-Bus sender: ${connection.name} → ${sender}`);
        // ----------------------------------------------------------------
        // CreateSession with proper Response signal handling
        // ----------------------------------------------------------------
        const sessionHandleToken = `gemini_session_${Date.now()}`;
        const createHandleToken = `gemini_create_${Date.now()}`;
        const createRequestPath = `/org/freedesktop/portal/desktop/request/${sender}/${createHandleToken}`;
        // Start listening BEFORE making the call (Response is ephemeral)
        const createResponsePromise = waitForPortalResponse(connection, createRequestPath, RESPONSE_TIMEOUT_MS);
        const sessionOptions = {
            handle_token: new dbusNext.Variant('s', createHandleToken),
            session_handle_token: new dbusNext.Variant('s', sessionHandleToken),
        };
        logger.log(`Creating portal session (token: ${sessionHandleToken})...`);
        await portalInterface.CreateSession(sessionOptions);
        // Wait for the Response signal with the actual session handle
        const createResponse = await createResponsePromise;
        if (createResponse.code !== 0) {
            throw new Error(`CreateSession failed with response code ${createResponse.code}`);
        }
        // Extract session path from Response (more reliable than constructing it)
        const sessionHandleFromResponse = createResponse.results?.session_handle?.value;
        sessionPath =
            sessionHandleFromResponse || `/org/freedesktop/portal/desktop/session/${sender}/${sessionHandleToken}`;
        logger.log(`Created portal session: ${sessionPath}`);
        // ----------------------------------------------------------------
        // Set up Activated signal handler using bus-level message listener
        // ----------------------------------------------------------------
        // We use the low-level bus 'message' event rather than
        // portalInterface.on('Activated') because the portal proxy's
        // signal delivery can be unreliable in some Electron/dbus-next
        // configurations.
        activatedMessageHandler = (msg) => {
            if (DEBUG_DBUS && msg.interface === GLOBAL_SHORTCUTS_INTERFACE) {
                logger.log('D-Bus GlobalShortcuts message received:', {
                    type: msg.type,
                    member: msg.member,
                    path: msg.path,
                    body: msg.body,
                });
            }
            if (msg.type === DBUS_MESSAGE_TYPE_SIGNAL &&
                msg.interface === GLOBAL_SHORTCUTS_INTERFACE &&
                msg.member === 'Activated') {
                const payload = parseShortcutSignalPayload(msg);
                if (!payload) {
                    return;
                }
                const { shortcutId } = payload;
                logger.log(`Shortcut activated via D-Bus: ${shortcutId}`);
                // Test-only: Record activation signal for integration test verification
                recordTestOnlyActivationSignal(shortcutId, sessionPath || 'unknown');
                const callback = actionCallbacks?.get(shortcutId);
                if (callback) {
                    try {
                        callback();
                    }
                    catch (error) {
                        logger.error(`Error executing callback for shortcut ${shortcutId}:`, error);
                    }
                }
                else {
                    logger.warn(`No action callback for activated shortcut: ${shortcutId}`);
                }
            }
            if (msg.type === DBUS_MESSAGE_TYPE_SIGNAL &&
                msg.interface === GLOBAL_SHORTCUTS_INTERFACE &&
                msg.member === 'Deactivated') {
                const payload = parseShortcutSignalPayload(msg);
                if (!payload) {
                    return;
                }
                const { shortcutId } = payload;
                logger.log(`Shortcut deactivated via D-Bus: ${shortcutId}`);
            }
        };
        connection.on?.('message', activatedMessageHandler);
        logger.log('Bus-level Activated signal handler registered');
        // ----------------------------------------------------------------
        // BindShortcuts with XDG-format accelerators
        // ----------------------------------------------------------------
        // Convert Electron accelerators to XDG spec format
        const shortcutSpecs = shortcuts.map((s) => {
            const xdgAccelerator = electronAcceleratorToXdg(s.accelerator);
            logger.log(`  Shortcut ${s.id}: "${s.accelerator}" → "${xdgAccelerator}"`);
            return [
                s.id,
                {
                    description: new dbusNext.Variant('s', s.description),
                    preferred_trigger: new dbusNext.Variant('s', xdgAccelerator),
                },
            ];
        });
        const bindHandleToken = `gemini_bind_${Date.now()}`;
        const bindRequestPath = `/org/freedesktop/portal/desktop/request/${sender}/${bindHandleToken}`;
        // Start listening for BindShortcuts Response BEFORE calling
        // NOTE: On KDE Plasma 6, BindShortcuts may show a user-approval dialog.
        // The Response signal arrives only after the user approves/dismisses it.
        const bindResponsePromise = waitForPortalResponse(connection, bindRequestPath, RESPONSE_TIMEOUT_MS);
        logger.log(`Binding ${shortcuts.length} shortcuts via D-Bus portal...`);
        await portalInterface.BindShortcuts(sessionPath, shortcutSpecs, '', // parent window (empty for no parent)
        { handle_token: new dbusNext.Variant('s', bindHandleToken) });
        // Wait for BindShortcuts Response
        let bindSucceeded = false;
        try {
            const bindResponse = await bindResponsePromise;
            if (bindResponse.code === 0) {
                logger.log(`BindShortcuts succeeded (code=0)`);
                bindSucceeded = true;
                // Log the trigger descriptions assigned by KDE
                const boundShortcuts = bindResponse.results?.shortcuts?.value;
                if (boundShortcuts) {
                    for (const [id, props] of boundShortcuts) {
                        const trigger = props?.trigger_description?.value;
                        logger.log(`  ${id}: trigger_description="${trigger || '(none)'}"`);
                    }
                }
            }
            else if (bindResponse.code === 1) {
                logger.warn('BindShortcuts: user dismissed the approval dialog (code=1)');
                bindSucceeded = false;
            }
            else {
                logger.warn(`BindShortcuts: unexpected response code ${bindResponse.code}`);
                bindSucceeded = false;
            }
        }
        catch (bindError) {
            // Timeout is non-fatal — shortcuts may still work if previously approved
            logger.warn(`BindShortcuts Response: ${bindError instanceof Error ? bindError.message : String(bindError)}`);
            logger.warn('Shortcuts may still work if previously approved by the user.');
            // On timeout, assume failure — caller can retry on next launch
            bindSucceeded = false;
        }
        if (bindSucceeded) {
            logger.log(`Bound ${shortcuts.length} shortcuts via D-Bus portal`);
            return shortcuts.map((s) => ({
                hotkeyId: s.id,
                success: true,
            }));
        }
        else {
            logger.warn(`BindShortcuts did not succeed — reporting failure for all ${shortcuts.length} shortcuts`);
            // Clean up D-Bus session since shortcuts won't work
            await destroySession();
            return shortcuts.map((s) => ({
                hotkeyId: s.id,
                success: false,
                error: 'User dismissed the approval dialog or bind timed out',
            }));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to register shortcuts via D-Bus: ${errorMessage}`);
        // Return failure for all shortcuts
        return shortcuts.map((s) => ({
            hotkeyId: s.id,
            success: false,
            error: errorMessage,
        }));
    }
}
/**
 * Destroy the current D-Bus session and clean up resources.
 *
 * This function:
 * 1. Removes bus-level signal handlers
 * 2. Disconnects from the session bus
 * 3. Clears module state
 *
 * Safe to call multiple times or without an active session.
 */
async function destroySession() {
    try {
        // Remove bus-level signal handler
        if (connection && activatedMessageHandler) {
            connection.removeListener?.('message', activatedMessageHandler);
        }
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        if (connection) {
            connection.disconnect();
            logger.log('D-Bus connection disconnected');
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error during D-Bus session cleanup: ${errorMessage}`);
    }
    finally {
        connection = null;
        sessionPath = null;
        portalInterface = null;
        activatedMessageHandler = null;
    }
}
