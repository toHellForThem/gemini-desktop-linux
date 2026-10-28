"use strict";
/**
 * Dedicated preload for the Google sign-in auth window.
 *
 * Google rejects Electron/embedded browsers with "This browser or app may not
 * be secure". This preload runs before the page scripts and stubs the
 * properties Google checks (navigator.webdriver, window.chrome,
 * navigator.userAgentData, plugins/mimeTypes, pdfViewerEnabled).
 *
 * The auth window pretends to be Microsoft Edge (like gfn-electron does),
 * because Edge is a supported browser for Google sign-in.
 *
 * It is only used by AuthWindow, never by the main application window.
 */
const { webFrame } = require("electron");

/**
 * Build the client-hint values that match the spoofed User-Agent for the
 * current platform. Keeping these in sync with the UA prevents Google from
 * seeing a Linux platform hint on a macOS/Windows UA (or vice versa).
 */
function getClientHintValues() {
    const chromeVersion = process.versions.chrome || '142.0.7444.265';
    const majorVersion = chromeVersion.split('.')[0] || '142';

    let platform = 'Linux';
    let platformVersion = '6.18.0';
    let architecture = 'x86';
    let bitness = '64';

    if (process.platform === 'darwin') {
        platform = 'macOS';
        platformVersion = '10.15.7';
    }
    else if (process.platform === 'win32') {
        platform = 'Windows';
        platformVersion = '10.0.0';
    }
    else {
        // On Linux, Chrome reports the kernel version. `getSystemVersion()` is
        // available in sandboxed preloads and returns it (e.g. "6.18.0").
        try {
            const systemVersion = typeof process.getSystemVersion === 'function'
                ? process.getSystemVersion()
                : '';
            if (systemVersion) {
                platformVersion = systemVersion;
            }
        }
        catch (e) {
            // Keep the fallback value.
        }
    }

    if (process.arch === 'arm64' || process.arch === 'arm') {
        architecture = 'arm';
    }
    if (process.arch === 'ia32' || process.arch === 'arm') {
        bitness = '32';
    }

    return {
        chromeVersion,
        majorVersion,
        platform,
        platformVersion,
        architecture,
        bitness,
    };
}

const hints = getClientHintValues();
const brands = [
    { brand: 'Microsoft Edge', version: hints.majorVersion },
    { brand: 'Chromium', version: hints.majorVersion },
    { brand: 'Not_A Brand', version: '99' },
];
const fullVersionList = [
    { brand: 'Microsoft Edge', version: hints.chromeVersion },
    { brand: 'Chromium', version: hints.chromeVersion },
    { brand: 'Not_A Brand', version: '99.0.0.0' },
];

webFrame.executeJavaScript(`
    try { Object.defineProperty(navigator, 'webdriver', { get: () => false }); } catch (e) {}
    try {
        if (!window.chrome) {
            window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
        }
    } catch (e) {}
    try {
        if (navigator.userAgentData) {
            Object.defineProperty(navigator.userAgentData, 'brands', {
                get: () => ${JSON.stringify(brands)},
            });
            Object.defineProperty(navigator.userAgentData, 'fullVersionList', {
                get: () => ${JSON.stringify(fullVersionList)},
            });
            if (typeof navigator.userAgentData.getHighEntropyValues === 'function') {
                navigator.userAgentData.getHighEntropyValues = function () {
                    return Promise.resolve({
                        architecture: ${JSON.stringify(hints.architecture)},
                        bitness: ${JSON.stringify(hints.bitness)},
                        brands: ${JSON.stringify(brands)},
                        fullVersionList: ${JSON.stringify(fullVersionList)},
                        mobile: false,
                        model: '',
                        platform: ${JSON.stringify(hints.platform)},
                        platformVersion: ${JSON.stringify(hints.platformVersion)},
                        uaFullVersion: ${JSON.stringify(hints.chromeVersion)},
                        wow64: false,
                    });
                };
            }
        }
    } catch (e) {}
    try { Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] }); } catch (e) {}
    try { Object.defineProperty(navigator, 'pdfViewerEnabled', { get: () => true }); } catch (e) {}
    try {
        const pluginData = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        ];
        const plugins = pluginData.map((plugin) => ({
            ...plugin,
            length: 1,
            item: () => null,
            namedItem: () => null,
        }));
        plugins.item = (index) => plugins[index] || null;
        plugins.namedItem = (name) => plugins.find((plugin) => plugin.name === name) || null;
        Object.defineProperty(navigator, 'plugins', { get: () => plugins });
        Object.defineProperty(navigator, 'mimeTypes', {
            get: () => [{
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format',
                enabledPlugin: plugins[0],
            }],
        });
    } catch (e) {}
`).catch((error) => {
    console.warn('[AuthPreload] Failed to apply auth spoofing:', error);
});
