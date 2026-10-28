"use strict";
/**
 * Sandbox Detection Utility
 *
 * Detects if the Electron chromium sandbox will fail to initialize on Linux.
 * Chromium uses two sandbox mechanisms on Linux:
 *   1. User namespace sandbox (preferred, requires unprivileged user namespaces)
 *   2. SUID sandbox (fallback, requires chrome-sandbox owned by root with mode 4755)
 *
 * If BOTH mechanisms are unavailable, Electron will crash on startup.
 * This module detects that condition and allows graceful fallback to --no-sandbox.
 *
 * Common scenarios where this applies:
 *   - AppImages on Ubuntu 24.04+ (AppArmor restricts user namespaces)
 *   - Local development (chrome-sandbox in node_modules lacks SUID permissions)
 *   - CI environments with restricted namespaces and no SUID binary setup
 *
 * @module sandboxDetector
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
exports.V8_SANDBOX_INCOMPATIBLE_KERNEL_MAJOR = void 0;
exports.isAppImage = isAppImage;
exports.hasAppArmorRestriction = hasAppArmorRestriction;
exports.hasUserNamespaceRestriction = hasUserNamespaceRestriction;
exports.hasUserNamespaceSupport = hasUserNamespaceSupport;
exports.hasSuidSandboxPermissions = hasSuidSandboxPermissions;
exports.shouldDisableSandbox = shouldDisableSandbox;
exports.getKernelMajorVersion = getKernelMajorVersion;
exports.isV8SandboxIncompatibleKernelForMainProcess = isV8SandboxIncompatibleKernelForMainProcess;
exports.isV8SandboxIncompatibleKernel = isV8SandboxIncompatibleKernel;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
/**
 * Minimum Linux kernel major version known to be incompatible with Electron's
 * V8 sandbox.
 *
 * On kernel 7.x and newer (paired with newer glibc), the V8 sandbox cage cannot
 * allocate ArrayBuffer backing stores inside the sandbox address space, so the
 * app crashes during startup with a fatal `v8_ArrayBuffer_NewBackingStore`
 * error — independently of whether the local text-prediction (node-llama-cpp)
 * feature is enabled.
 *
 * See https://github.com/bwendell/gemini-desktop/issues/119 (and #315, #334).
 */
exports.V8_SANDBOX_INCOMPATIBLE_KERNEL_MAJOR = 7;
/**
 * Check if running as an AppImage.
 * AppImages set the APPIMAGE environment variable when running.
 */
function isAppImage() {
    return !!process.env.APPIMAGE;
}
/**
 * Check if AppArmor restricts unprivileged user namespaces.
 * Ubuntu 24.04+ enables this by default, which breaks Electron sandbox in AppImages.
 *
 * @returns true if AppArmor restriction is active
 */
function hasAppArmorRestriction() {
    try {
        const value = fs.readFileSync('/proc/sys/kernel/apparmor_restrict_unprivileged_userns', 'utf8').trim();
        return value === '1';
    }
    catch {
        // File doesn't exist on non-AppArmor systems or older kernels
        return false;
    }
}
/**
 * Check if unprivileged user namespaces are disabled at the kernel level.
 *
 * @returns true if user namespaces are disabled
 */
function hasUserNamespaceRestriction() {
    try {
        const value = fs.readFileSync('/proc/sys/kernel/unprivileged_userns_clone', 'utf8').trim();
        return value === '0';
    }
    catch {
        // File doesn't exist on systems that always allow user namespaces
        return false;
    }
}
/**
 * Check if unprivileged user namespaces are available.
 * This is the preferred sandbox mechanism on modern Linux.
 *
 * User namespaces are available when:
 *   - AppArmor does NOT restrict them, AND
 *   - The kernel allows unprivileged user namespace creation
 *
 * @returns true if user namespace sandbox can be used
 */
function hasUserNamespaceSupport() {
    return !hasAppArmorRestriction() && !hasUserNamespaceRestriction();
}
/**
 * Check if the SUID sandbox helper binary has correct permissions.
 * Electron requires chrome-sandbox to be owned by root (uid 0) with the
 * SUID bit set (mode 4755). Without this, the SUID sandbox fallback fails.
 *
 * Also checks the CHROME_DEVEL_SANDBOX environment variable, which Chromium
 * supports for overriding the sandbox binary path.
 *
 * @returns true if the SUID sandbox binary exists with correct permissions
 */
function hasSuidSandboxPermissions() {
    // Chromium respects CHROME_DEVEL_SANDBOX as an override path
    const overridePath = process.env.CHROME_DEVEL_SANDBOX;
    const chromeSandboxPath = overridePath || path.join(path.dirname(process.execPath), 'chrome-sandbox');
    try {
        const stat = fs.statSync(chromeSandboxPath);
        // Must be owned by root (uid 0) and have SUID bit + 0755 permissions
        return stat.uid === 0 && (stat.mode & 0o4755) === 0o4755;
    }
    catch {
        // Binary doesn't exist or can't be stat'd
        return false;
    }
}
/**
 * Detect if the sandbox will fail and should be disabled.
 *
 * Returns true when BOTH sandbox mechanisms are unavailable:
 *   1. User namespace sandbox is blocked (AppArmor or kernel restriction), AND
 *   2. SUID sandbox fallback is not viable (chrome-sandbox lacks permissions)
 *
 * This covers:
 *   - AppImages on restrictive systems (original use case)
 *   - Local development (chrome-sandbox in node_modules is never SUID)
 *   - CI environments with restricted namespaces
 *
 * @returns true if sandbox should be disabled for compatibility
 */
function shouldDisableSandbox() {
    // Only applies to Linux — macOS and Windows use different sandbox mechanisms
    if (process.platform !== 'linux') {
        return false;
    }
    // If user namespaces are available, the preferred sandbox works fine
    if (hasUserNamespaceSupport()) {
        return false;
    }
    // User namespaces are restricted — check if SUID sandbox is a viable fallback
    if (hasSuidSandboxPermissions()) {
        return false;
    }
    // Neither sandbox mechanism is available — disable to prevent crash
    return true;
}
/**
 * Parse the major version number from a Linux kernel release string.
 *
 * Examples:
 *   "7.0.0-15-generic" -> 7
 *   "7.0.10-2-cachyos" -> 7
 *   "6.18.5"           -> 6
 *
 * @param release - Kernel release string (e.g. from os.release())
 * @returns The major version as a number, or null if it can't be parsed
 */
function getKernelMajorVersion(release) {
    const match = /^(\d+)\./.exec(release);
    if (!match) {
        return null;
    }
    const major = Number.parseInt(match[1] ?? '', 10);
    return Number.isNaN(major) ? null : major;
}
/**
 * Detect whether the running Linux kernel is known to be incompatible with
 * Electron's V8 sandbox.
 *
 * On affected kernels (major >= {@link V8_SANDBOX_INCOMPATIBLE_KERNEL_MAJOR}),
 * native addons that allocate ArrayBuffer backing stores outside the V8 sandbox
 * cage — notably `dbus-next` (via its native `usocket` transport) and
 * `node-llama-cpp` — trigger a fatal `v8_ArrayBuffer_NewBackingStore` crash at
 * startup. Because the sandbox cage cannot be reliably disabled at runtime, we
 * use this predicate to avoid loading those modules on affected kernels rather
 * than attempting to turn the sandbox off.
 *
 * The kernel release is injectable for testing; it defaults to os.release().
 *
 * @param release - Kernel release string (defaults to os.release())
 * @returns true if sandbox-incompatible native modules must not be loaded
 */
function isV8SandboxIncompatibleKernelForMainProcess(release = os.release()) {
    // Only applies to Linux — macOS and Windows are unaffected
    if (process.platform !== 'linux') {
        return false;
    }
    const major = getKernelMajorVersion(release);
    if (major === null) {
        // Unparseable kernel string — err on the side of treating it as compatible
        return false;
    }
    return major >= exports.V8_SANDBOX_INCOMPATIBLE_KERNEL_MAJOR;
}
/**
 * Sidecar-aware compatibility check.
 *
 * `node-llama-cpp` no longer runs inside the Electron main process: it is
 * executed in an isolated child process (see `llm/llamaWorker.cjs`). A V8
 * sandbox crash in that child cannot take down the main window, so the kernel
 * is treated as compatible for sidecar-hosted native modules.
 *
 * Modules that still load native addons directly in the main process (for
 * example `dbus-next`/`usocket`) must keep using
 * {@link isV8SandboxIncompatibleKernelForMainProcess}.
 *
 * @param _release - Kernel release string (unused; kept for API compatibility)
 * @returns always false — sidecar-hosted modules are safe on any kernel
 */
function isV8SandboxIncompatibleKernel(_release = os.release()) {
    return false;
}
