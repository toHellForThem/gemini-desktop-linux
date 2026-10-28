"use strict";
/**
 * Path resolution utilities for Electron.
 * Centralizes all file path logic for easier maintenance and testing.
 *
 * @module paths
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
exports.getPreloadPath = getPreloadPath;
exports.getDistHtmlPath = getDistHtmlPath;
exports.getIconPath = getIconPath;
exports.getNotificationIconPath = getNotificationIconPath;
exports.getTrayIconPath = getTrayIconPath;
const path = __importStar(require("path"));
const electron_1 = require("electron");
const platformAdapterFactory_1 = require("../platform/platformAdapterFactory.cjs");
/**
 * Get the preload script path.
 * Resolves to compiled CJS in dist-electron directory.
 *
 * @returns Absolute path to preload.cjs
 */
function getPreloadPath() {
    return path.join(__dirname, '../../preload/preload.cjs');
}
/**
 * Get path to a file in the dist directory.
 *
 * @param filename - Name of the HTML file (e.g., 'index.html', 'options.html')
 * @returns Absolute path to the dist HTML file
 */
function getDistHtmlPath(filename) {
    return path.join(__dirname, '../../../dist', filename);
}
/**
 * Get the application icon path.
 * In development: uses the build/ directory relative to source
 * In production: uses process.resourcesPath where electron-builder copies icons
 *
 * @returns Absolute path to app icon
 */
function getIconPath() {
    const iconFilename = (0, platformAdapterFactory_1.getPlatformAdapter)().getAppIconFilename();
    // In packaged app, icons are in resources/ directory (via electron-builder extraFiles)
    if (electron_1.app.isPackaged) {
        return path.join(process.resourcesPath, iconFilename);
    }
    // In development, icons are in build/ directory
    return path.join(__dirname, '../../../build', iconFilename);
}
/**
 * Get the notification icon path.
 * Notifications always require PNG format (even on Windows).
 * Supports Flatpak, standard packaging, and development environments.
 *
 * @returns Absolute path to notification icon (PNG)
 */
function getNotificationIconPath() {
    // Icon filename - always PNG for notifications (Electron Notification requirement)
    const iconFilename = 'icon.png';
    if (electron_1.app.isPackaged) {
        // Check Flatpak environment first
        // Flatpak sets FLATPAK_ID and stores icons in /app/share/icons
        if (process.env.FLATPAK_ID) {
            // Flatpak standard icon location
            const flatpakIconPath = path.join('/app/share/icons/hicolor/256x256/apps', `${process.env.FLATPAK_ID}.png`);
            return flatpakIconPath;
        }
        // Standard electron-builder packaging (AppImage, deb, rpm, dmg, nsis)
        return path.join(process.resourcesPath, iconFilename);
    }
    // In development, icons are in build/ directory
    return path.join(__dirname, '../../../build', iconFilename);
}
/**
 * Get the tray icon path.
 * In development: uses the build/ directory relative to source
 * In production: uses process.resourcesPath where electron-builder copies icons
 *
 * @returns Absolute path to tray icon
 */
function getTrayIconPath() {
    const trayIconFilename = (0, platformAdapterFactory_1.getPlatformAdapter)().getTrayIconFilename();
    // In packaged app, icons are in resources/ directory (via electron-builder extraFiles)
    if (electron_1.app.isPackaged) {
        return path.join(process.resourcesPath, trayIconFilename);
    }
    // In development, icons are in build/ directory
    return path.join(__dirname, '../../../build', trayIconFilename);
}
