"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectWaylandSession = detectWaylandSession;
exports.detectDesktopEnvironment = detectDesktopEnvironment;
exports.detectDEVersion = detectDEVersion;
exports.isSupportedDE = isSupportedDE;
exports.getWaylandStatus = getWaylandStatus;
const logger_1 = require("./logger.cjs");
const logger = (0, logger_1.createLogger)('[WaylandDetector]');
function detectWaylandSession() {
    const sessionType = process.env.XDG_SESSION_TYPE;
    if (!sessionType) {
        return false;
    }
    return sessionType.toLowerCase() === 'wayland';
}
function detectDesktopEnvironment() {
    const desktopEnv = process.env.XDG_CURRENT_DESKTOP;
    if (!desktopEnv) {
        return 'unknown';
    }
    const parts = desktopEnv.split(':');
    for (const part of parts) {
        const normalized = part.toLowerCase();
        if (normalized === 'kde') {
            return 'kde';
        }
        if (normalized === 'gnome') {
            return 'gnome';
        }
        if (normalized === 'hyprland') {
            return 'hyprland';
        }
        if (normalized === 'sway') {
            return 'sway';
        }
        if (normalized === 'cosmic') {
            return 'cosmic';
        }
        if (normalized === 'deepin') {
            return 'deepin';
        }
    }
    return 'unknown';
}
function detectDEVersion(de) {
    if (de === 'kde') {
        const version = process.env.KDE_SESSION_VERSION;
        if (!version) {
            return null;
        }
        return version;
    }
    if (de === 'gnome') {
        const sessionId = process.env.GNOME_DESKTOP_SESSION_ID;
        if (!sessionId) {
            return null;
        }
        return sessionId;
    }
    return null;
}
function isSupportedDE(de, _version) {
    return de !== 'unknown';
}
function getWaylandStatus() {
    const isWayland = detectWaylandSession();
    const desktopEnvironment = detectDesktopEnvironment();
    const deVersion = detectDEVersion(desktopEnvironment);
    const hasSessionBus = Boolean(process.env.DBUS_SESSION_BUS_ADDRESS || process.env.XDG_RUNTIME_DIR);
    const portalAvailable = isWayland && isSupportedDE(desktopEnvironment, deVersion) && hasSessionBus;
    const portalMethod = 'none';
    const status = {
        isWayland,
        desktopEnvironment,
        deVersion,
        portalAvailable,
        portalMethod,
    };
    logger.log('Wayland detection:', status);
    return status;
}
