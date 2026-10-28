"use strict";
/**
 * Auto-Update Manager
 *
 * Handles automatic application updates using electron-updater.
 * Provides VS Code-style update experience with:
 * - Background update checking
 * - User opt-out via settings
 * - Native OS notifications
 * - Platform-specific handling (macOS, Windows, Linux)
 *
 * @module UpdateManager
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const logger_1 = require("../utils/logger.cjs");
const semver_1 = require("semver");
const platformAdapterFactory_1 = require("../platform/platformAdapterFactory.cjs");
const LinuxX11Adapter_1 = require("../platform/adapters/LinuxX11Adapter.cjs");
const MacAdapter_1 = require("../platform/adapters/MacAdapter.cjs");
const WindowsAdapter_1 = require("../platform/adapters/WindowsAdapter.cjs");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const logger = (0, logger_1.createLogger)('[UpdateManager]');
/**
 * TEMPORARY (Linux fork): auto-updates are disabled until this fork has its
 * own update channel. The bundled app-update.yml points at the upstream repo
 * (bwendell/gemini-desktop), so letting electron-updater run would overwrite
 * this build with upstream releases. Set to false once a dedicated update
 * channel exists for this fork.
 */
const FORK_DISABLE_AUTO_UPDATES = true;
/**
 * Get the autoUpdater instance via dynamic import.
 * This is critical for Linux CI - static import causes electron-updater to
 * initialize immediately on module load, which hangs trying to connect to D-Bus.
 */
async function getAutoUpdater() {
    const { autoUpdater } = await Promise.resolve().then(() => __importStar(require('electron-updater')));
    return autoUpdater;
}
/**
 * UpdateManager handles automatic application updates.
 *
 * Features:
 * - Periodic background checking for updates
 * - Silent download of updates
 * - User notification when update is ready
 * - Opt-out via settings
 * - Platform-aware (disables for DEB/RPM Linux, portable Windows)
 */
class UpdateManager {
    autoUpdater = null;
    autoUpdaterPromise = null;
    enabled = true;
    checkInterval = null;
    lastCheckTime = 0;
    isFirstCheck = true;
    isManualCheck = false;
    settings;
    badgeManager;
    trayManager;
    updatesDisabled;
    manualUpdateOnly;
    /**
     * Creates a new UpdateManager instance.
     * @param settings - Settings store for persisting auto-update preferences
     * @param deps - Optional dependencies for visual notifications
     */
    constructor(settings, deps) {
        this.settings = settings;
        this.badgeManager = deps?.badgeManager;
        this.trayManager = deps?.trayManager;
        if (FORK_DISABLE_AUTO_UPDATES) {
            // TEMPORARY (Linux fork): never initialize electron-updater and
            // never hit the GitHub API. `manualUpdateOnly = false` makes
            // checkForUpdates() fall through to ensureAutoUpdater(), which
            // returns null because updatesDisabled is true.
            this.updatesDisabled = true;
            this.enabled = false;
            this.manualUpdateOnly = false;
            logger.log('Auto-updates disabled in this fork (temporary)');
            return;
        }
        // Check if we should disable updates FIRST before any autoUpdater initialization
        // This prevents electron-updater from initializing native resources on unsupported platforms
        // CRITICAL: This MUST happen synchronously in constructor to prevent D-Bus hang on Linux CI
        this.updatesDisabled = this.shouldDisableUpdates();
        const platformAdapter = this.getAdapterForUpdateChecks(this.mockPlatform || process.platform);
        this.manualUpdateOnly = !platformAdapter.supportsAutoUpdate(this.mockEnv || process.env);
        if (this.updatesDisabled && !this.manualUpdateOnly) {
            this.enabled = false;
            logger.log('Auto-updates disabled for this platform/install type');
            logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);
            return; // Exit early - autoUpdater will never be loaded
        }
        if (this.manualUpdateOnly) {
            this.enabled = this.settings.get('autoUpdateEnabled') ?? true;
            logger.log('Manual-update-only mode enabled');
            logger.log(`UpdateManager initialized (enabled: ${this.enabled}, manualUpdateOnly: true)`);
            if (this.enabled &&
                electron_1.app.isPackaged &&
                !process.argv.includes('--test-auto-update') &&
                !process.env.TEST_AUTO_UPDATE) {
                this.startPeriodicChecks();
            }
            return;
        }
        // Load user preference (default to enabled)
        this.enabled = this.settings.get('autoUpdateEnabled') ?? true;
        logger.log(`UpdateManager initialized (enabled: ${this.enabled})`);
        // Start periodic checks if enabled
        // EXCEPTION: In test mode (--test-auto-update), we skip automatic checks
        // because CI environments cannot reach GitHub releases. The test flag is
        // specifically for verifying initialization works (dev-app-update.yml is found),
        // not for testing actual network update checks.
        if (this.enabled && !process.argv.includes('--test-auto-update') && !process.env.TEST_AUTO_UPDATE) {
            this.startPeriodicChecks();
        }
    }
    /**
     * Lazily initialize the autoUpdater.
     * This uses dynamic import to avoid loading electron-updater on unsupported platforms.
     */
    async ensureAutoUpdater() {
        if (this.updatesDisabled) {
            return null;
        }
        if (this.autoUpdater) {
            return this.autoUpdater;
        }
        // Avoid multiple concurrent imports
        if (this.autoUpdaterPromise) {
            return this.autoUpdaterPromise;
        }
        this.autoUpdaterPromise = (async () => {
            logger.log('Lazily loading electron-updater...');
            const updater = await getAutoUpdater();
            // Configure auto-updater
            updater.autoDownload = true;
            updater.autoInstallOnAppQuit = true;
            if (process.platform === 'win32') {
                updater.channel = process.arch === 'arm64' ? 'latest-arm64' : 'latest-x64';
                updater.allowDowngrade = false;
            }
            if (process.platform === 'darwin') {
                updater.channel = process.arch === 'arm64' ? 'arm64' : 'x64';
            }
            if (process.argv.includes('--test-auto-update')) {
                updater.forceDevUpdateConfig = true;
            }
            // Configure logging
            updater.logger = electron_log_1.default;
            electron_log_1.default.transports.file.level = 'info';
            this.setupEventListeners(updater);
            this.autoUpdater = updater;
            logger.log('electron-updater loaded and configured');
            return updater;
        })();
        return this.autoUpdaterPromise;
    }
    /**
     * Determine if auto-updates should be disabled based on platform and install type.
     * @returns true if updates should be disabled
     */
    shouldDisableUpdates() {
        const currentPlatform = this.mockPlatform || process.platform;
        const currentEnv = this.mockEnv || process.env;
        // Allow updates in test environment (Vitest, Integration Tests, or E2E with --test-auto-update flag)
        if (currentEnv.VITEST || currentEnv.TEST_AUTO_UPDATE || process.argv.includes('--test-auto-update')) {
            return false;
        }
        const platformAdapter = this.getAdapterForUpdateChecks(currentPlatform);
        if (platformAdapter.shouldDisableUpdates(currentEnv)) {
            if (currentPlatform === 'linux') {
                logger.log('Linux non-AppImage detected (or simulated) - updates disabled');
                return true;
            }
            if (currentPlatform === 'win32') {
                logger.log('Windows Portable detected - updates disabled');
                return true;
            }
        }
        // Development mode - skip updates (unless testing)
        if (!electron_1.app.isPackaged && !process.argv.includes('--test-auto-update') && !currentEnv.TEST_AUTO_UPDATE) {
            logger.log('Development mode detected - updates disabled');
            return true;
        }
        return false;
    }
    getAdapterForUpdateChecks(currentPlatform) {
        if (!this.mockPlatform || currentPlatform === process.platform) {
            return (0, platformAdapterFactory_1.getPlatformAdapter)();
        }
        switch (currentPlatform) {
            case 'linux':
                return new LinuxX11Adapter_1.LinuxX11Adapter();
            case 'win32':
                return new WindowsAdapter_1.WindowsAdapter();
            case 'darwin':
                return new MacAdapter_1.MacAdapter();
            default:
                logger.warn(`Unsupported mocked platform '${currentPlatform}'. Falling back to host adapter.`);
                return (0, platformAdapterFactory_1.getPlatformAdapter)();
        }
    }
    /**
     * Check if auto-updates are enabled.
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Enable or disable auto-updates.
     * Setting is persisted to disk.
     * @param enabled - Whether to enable auto-updates
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.settings.set('autoUpdateEnabled', enabled);
        logger.log(`Auto-updates ${enabled ? 'enabled' : 'disabled'}`);
        if (enabled && !this.checkInterval) {
            this.startPeriodicChecks();
        }
        else if (!enabled && this.checkInterval) {
            this.stopPeriodicChecks();
        }
    }
    /**
     * Check for updates.
     * @param manual - If true, bypasses the enabled check (for user-initiated checks)
     */
    async checkForUpdates(manual = false) {
        if (!this.enabled && !manual) {
            logger.log('Update check skipped - updates disabled');
            return;
        }
        if (!electron_1.app.isPackaged && !process.argv.includes('--test-auto-update')) {
            logger.log('Update check skipped - development mode');
            return;
        }
        if (this.manualUpdateOnly) {
            try {
                this.isManualCheck = manual;
                this.lastCheckTime = Date.now();
                logger.log(manual ? 'Manual update check (GitHub API)...' : 'Checking for updates (GitHub API)...');
                this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECKING, null);
                const updateInfo = await this.checkGitHubForLatestRelease();
                if (updateInfo) {
                    logger.log(`Manual update available: ${updateInfo.version}`);
                    this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_MANUAL_UPDATE_AVAILABLE, updateInfo);
                }
                else {
                    logger.log('No update available (GitHub API)');
                    if (this.isFirstCheck || this.isManualCheck) {
                        this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE, {
                            version: electron_1.app.getVersion(),
                        });
                    }
                }
            }
            catch (error) {
                if (error instanceof Error && error.message === 'GITHUB_API_RESPONSE_NOT_OK') {
                    logger.warn('GitHub API returned non-OK response');
                }
                else {
                    logger.error('GitHub update check failed:', error);
                }
                if (manual) {
                    this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR, 'Could not check for updates. Please check your internet connection.');
                }
                else {
                    logger.log('Suppressing manual-update-only error notification (background check)');
                }
            }
            finally {
                this.isFirstCheck = false;
                this.isManualCheck = false;
            }
            return;
        }
        try {
            logger.log(manual ? 'Manual update check...' : 'Checking for updates...');
            this.isManualCheck = manual;
            const updater = await this.ensureAutoUpdater();
            if (!updater) {
                logger.log('Update check skipped - updater not available');
                return;
            }
            await updater.checkForUpdatesAndNotify();
        }
        catch (error) {
            logger.error('Update check failed:', error);
            // Check if this is a known "benign" error (like 404/403 which means no access/no releases)
            // or a network error which we should suppress for background checks
            const errorStr = error instanceof Error ? error.message : String(error ?? '');
            const errorStrLower = errorStr.toLowerCase();
            const isNetworkOrConfigError = errorStr.includes('404') ||
                errorStr.includes('403') ||
                errorStrLower.includes('github') ||
                errorStr.includes('Network') ||
                errorStr.includes('net::') ||
                errorStr.includes('Cannot find latest') ||
                errorStr.includes('no published versions');
            // If it's a manual check, or if it's NOT a benign/network error, we warn the user.
            // But if it IS a background check AND a network/config error, we stay silent to avoid annoying toasts.
            if (manual || !isNetworkOrConfigError) {
                // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
                this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR, 'The auto-update service encountered an error. Please try again later.');
            }
            else {
                logger.log('Suppressing update error notification (background check + network/config error)');
                logger.log('Suppressed error details:', errorStr || error);
            }
        }
    }
    startupTimeout = null;
    /**
     * Start periodic update checks.
     * @param intervalMs - Interval between checks in milliseconds (default: 6 hours)
     */
    startPeriodicChecks(intervalMs = 6 * 60 * 60 * 1000) {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (!this.enabled) {
            logger.log('Periodic checks not started - updates disabled');
            return;
        }
        this.checkInterval = setInterval(() => {
            this.checkForUpdates();
        }, intervalMs);
        logger.log(`Periodic update checks started (interval: ${intervalMs / 1000}s)`);
        // Also check immediately on startup (with a small delay)
        // Clear any existing startup timeout first
        if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
        }
        this.startupTimeout = setTimeout(() => {
            this.checkForUpdates();
            this.startupTimeout = null;
        }, 10000); // Wait 10 seconds after startup
    }
    /**
     * Stop periodic update checks.
     */
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.startupTimeout) {
            clearTimeout(this.startupTimeout);
            this.startupTimeout = null;
        }
        logger.log('Periodic (and startup) update checks stopped');
    }
    /**
     * Quit the application and install the pending update.
     * Only works if an update has been downloaded.
     */
    quitAndInstall() {
        logger.log('Quitting and installing update...');
        // Clear native indicators before quitting
        this.badgeManager?.clearUpdateBadge();
        this.trayManager?.clearUpdateTooltip();
        if (this.mockEnv?.TEST_AUTO_UPDATE ||
            process.env.TEST_AUTO_UPDATE ||
            process.argv.includes('--test-auto-update') ||
            process.argv.includes('--integration-test')) {
            logger.log('Test auto-update mode detected - skipping quitAndInstall');
            return;
        }
        if (this.autoUpdater) {
            this.autoUpdater.quitAndInstall(false, true);
        }
        else {
            logger.warn('quitAndInstall called but autoUpdater not loaded');
        }
    }
    /**
     * Get the timestamp of the last update check.
     */
    getLastCheckTime() {
        return this.lastCheckTime;
    }
    /**
     * Get the current tray tooltip (for E2E testing).
     */
    getTrayTooltip() {
        return this.trayManager?.getToolTip() || '';
    }
    /**
     * Set up event listeners for auto-updater events.
     * @param updater - The autoUpdater instance to attach listeners to
     */
    setupEventListeners(updater) {
        updater.on('error', (error) => {
            logger.error('Auto-updater error:', error);
            // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
            // Raw errors from electron-updater can be massive (HTML, full stack traces) and
            // cause UI rendering issues (toasts going off-screen).
            // We log the real error above for debugging, but tell the user a generic message.
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR, 'The auto-update service encountered an error. Please try again later.');
        });
        updater.on('checking-for-update', () => {
            logger.log('Checking for update...');
            this.lastCheckTime = Date.now();
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECKING, null);
        });
        updater.on('update-available', (info) => {
            const currentVersion = this.normalizeVersion(electron_1.app.getVersion());
            const incomingVersion = this.normalizeVersion(info.version);
            if (currentVersion && incomingVersion) {
                const comparison = (0, semver_1.compare)(currentVersion, incomingVersion);
                if (comparison != null && comparison >= 0) {
                    logger.warn(`Ignoring update-available for version ${info.version} (current: ${electron_1.app.getVersion()})`);
                    return;
                }
            }
            logger.log(`Update available: ${info.version}`);
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_AVAILABLE, info);
            this.isFirstCheck = false;
            this.isManualCheck = false;
        });
        updater.on('update-not-available', (info) => {
            logger.log(`No update available (current: ${info.version})`);
            if (this.isFirstCheck || this.isManualCheck) {
                this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE, info);
            }
            else {
                logger.log('Suppressing "up to date" notification (periodic background check)');
            }
            this.isFirstCheck = false;
            this.isManualCheck = false;
        });
        updater.on('download-progress', (progress) => {
            logger.log(`Download progress: ${progress.percent.toFixed(1)}%`);
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS, progress);
        });
        updater.on('update-downloaded', (info) => {
            logger.log(`Update downloaded: ${info.version}`);
            // Show native badge and tray tooltip
            this.badgeManager?.showUpdateBadge();
            this.trayManager?.setUpdateTooltip(info.version);
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED, info);
        });
    }
    /**
     * Broadcast an event to all renderer windows.
     * @param channel - IPC channel name
     * @param data - Data to send
     */
    broadcastToWindows(channel, data) {
        const windows = electron_1.BrowserWindow.getAllWindows();
        for (const win of windows) {
            if (!win.isDestroyed()) {
                try {
                    win.webContents.send(channel, data);
                }
                catch (error) {
                    logger.warn(`Failed to send ${channel} to window:`, error);
                }
            }
        }
    }
    normalizeVersion(version) {
        const trimmed = version.trim();
        if (!trimmed)
            return null;
        const cleaned = trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
        const parsed = (0, semver_1.valid)(cleaned);
        if (parsed) {
            return parsed;
        }
        const coerced = (0, semver_1.coerce)(cleaned)?.version ?? null;
        if (!coerced) {
            logger.warn(`Unable to parse version string: ${version}`);
        }
        return coerced;
    }
    isNewerVersion(versionA, versionB) {
        if (!versionA || !versionB) {
            if (versionA && !versionB) {
                logger.warn('Unable to compare versions (missing current version)', { versionA, versionB });
            }
            return false;
        }
        return (0, semver_1.compare)(versionA, versionB) > 0;
    }
    // =========================================================================
    // Dev Testing Methods (only for manual testing in development)
    // =========================================================================
    mockPlatform = null;
    mockEnv = null;
    /**
     * Show the update badge for dev testing.
     * This allows testing the native badge without a real update.
     * @param version - Optional version string for tray tooltip
     */
    devShowBadge(version = '2.0.0-test') {
        logger.log('[DEV] Showing test update badge');
        this.badgeManager?.showUpdateBadge();
        this.trayManager?.setUpdateTooltip(version);
    }
    /**
     * Clear the update badge for dev testing.
     */
    devClearBadge() {
        logger.log('[DEV] Clearing test update badge');
        this.badgeManager?.clearUpdateBadge();
        this.trayManager?.clearUpdateTooltip();
    }
    /**
     * Mock the platform for testing logic.
     */
    devMockPlatform(platform) {
        this.mockPlatform = platform;
        this.devReevaluate();
    }
    /**
     * Mock env vars for testing logic.
     */
    devMockEnv(env) {
        this.mockEnv = env;
        this.devReevaluate();
    }
    /**
     * Emit a simulated update event.
     */
    devEmitUpdateEvent(event, data) {
        logger.log(`[DEV] Emitting mock event: ${event}`);
        if (event === 'error') {
            // MASKED ERROR: Do NOT send the raw error message to the renderer/user.
            // Raw errors from electron-updater can be massive (HTML, full stack traces) and
            // cause UI rendering issues (toasts going off-screen).
            // We log the real error above for debugging, but tell the user a generic message.
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR, 'The auto-update service encountered an error. Please try again later.');
        }
        else if (event === 'checking-for-update') {
            this.broadcastToWindows(ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_CHECKING, null);
        }
        else {
            // Map update events to their corresponding IPC channels
            const eventChannelMap = {
                'update-available': ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_AVAILABLE,
                'manual-update-available': ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_MANUAL_UPDATE_AVAILABLE,
                'update-not-available': ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE,
                'update-downloaded': ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED,
                'update-error': ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR,
                error: ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_ERROR,
                'download-progress': ipc_channels_1.IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS,
            };
            const channel = eventChannelMap[event];
            if (channel) {
                const payload = event === 'update-downloaded'
                    ? {
                        version: typeof data === 'object' && data !== null && 'version' in data
                            ? String(data.version)
                            : '',
                    }
                    : data;
                setImmediate(() => {
                    this.broadcastToWindows(channel, payload);
                });
            }
            else {
                setImmediate(() => {
                    this.broadcastToWindows(`auto-update:${event}`, data);
                });
            }
        }
        // Also update internal state if needed
        if (event === 'update-downloaded') {
            this.badgeManager?.showUpdateBadge();
            const tooltipVersion = typeof data === 'object' && data !== null && 'version' in data
                ? String(data.version)
                : '';
            this.trayManager?.setUpdateTooltip(tooltipVersion || '');
        }
    }
    /**
     * Re-evaluate enabled state based on current (potentially mocked) platform/env.
     */
    devReevaluate() {
        const updatesDisabled = this.shouldDisableUpdates();
        const platformAdapter = this.getAdapterForUpdateChecks(this.mockPlatform || process.platform);
        this.manualUpdateOnly = !platformAdapter.supportsAutoUpdate(this.mockEnv || process.env);
        if (updatesDisabled && !this.manualUpdateOnly) {
            this.enabled = false;
            return;
        }
        if (this.manualUpdateOnly) {
            this.enabled = this.settings.get('autoUpdateEnabled') ?? true;
            return;
        }
        this.enabled = this.settings.get('autoUpdateEnabled') ?? true;
    }
    async checkGitHubForLatestRelease() {
        const response = await electron_1.net.fetch('https://api.github.com/repos/bwendell/gemini-desktop/releases/latest', {
            headers: { 'User-Agent': 'gemini-desktop-updater' },
        });
        if (!response.ok) {
            logger.warn(`GitHub API returned ${response.status}`);
            throw new Error('GITHUB_API_RESPONSE_NOT_OK');
        }
        const release = (await response.json());
        const tagName = this.getGitHubReleaseField(release, 'tag_name');
        const releaseName = this.getGitHubReleaseField(release, 'name');
        const releaseNotes = this.getGitHubReleaseField(release, 'body');
        const latestVersion = this.normalizeVersion(tagName || '');
        const currentVersion = this.normalizeVersion(electron_1.app.getVersion());
        if (!latestVersion) {
            return null;
        }
        if (this.isNewerVersion(latestVersion, currentVersion)) {
            return {
                version: latestVersion,
                releaseName: releaseName || undefined,
                releaseNotes: releaseNotes || undefined,
                files: [],
                path: '',
                sha512: '',
                releaseDate: '',
            };
        }
        return null;
    }
    getGitHubReleaseField(release, field) {
        if (!release || typeof release !== 'object') {
            return undefined;
        }
        const value = release[field];
        return typeof value === 'string' ? value : undefined;
    }
    /**
     * Clean up resources when the manager is destroyed.
     */
    destroy() {
        this.stopPeriodicChecks();
        // Only remove listeners if autoUpdater was initialized
        if (this.autoUpdater) {
            this.autoUpdater.removeAllListeners();
        }
        logger.log('UpdateManager destroyed');
    }
}
exports.default = UpdateManager;
