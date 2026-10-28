'use strict';
/**
 * Shared Google sign-in spoofing helpers.
 *
 * Google rejects Electron/embedded browsers with "This browser or app may not
 * be secure". The auth window and the main-window sign-in flow both need the
 * same Edge-like User-Agent and Sec-CH-UA client hints, so the header
 * spoofing is registered once on the default session.
 *
 * @module authSpoofing
 */
const { session } = require('electron');
const os = require('os');

let registered = false;

function getChromeVersion() {
    return process.versions.chrome || '142.0.7444.265';
}

function getPlatformToken() {
    if (process.platform === 'darwin') {
        return 'Macintosh; Intel Mac OS X 10_15_7';
    }
    if (process.platform === 'win32') {
        return 'Windows NT 10.0; Win64; x64';
    }
    return 'X11; Linux x86_64';
}

function getAuthUserAgent() {
    const chromeVersion = getChromeVersion();
    return `Mozilla/5.0 (${getPlatformToken()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${chromeVersion}`;
}

function getAuthPlatform() {
    if (process.platform === 'darwin') {
        return 'macOS';
    }
    if (process.platform === 'win32') {
        return 'Windows';
    }
    return 'Linux';
}

function getAuthPlatformVersion() {
    if (process.platform === 'darwin') {
        return '10.15.7';
    }
    if (process.platform === 'win32') {
        return '10.0.0';
    }
    // Chrome reports the kernel version as the platform version on Linux.
    try {
        return os.release() || '6.18.0';
    }
    catch {
        return '6.18.0';
    }
}

/**
 * Register the Edge-like User-Agent and Sec-CH-UA* headers for Google
 * sign-in requests. Safe to call multiple times.
 */
function registerAuthHeaderSpoofing() {
    if (registered) {
        return;
    }
    registered = true;

    const chromeVersion = getChromeVersion();
    const majorVersion = chromeVersion.split('.')[0] || '142';
    const userAgent = getAuthUserAgent();
    const platform = getAuthPlatform();
    const platformVersion = getAuthPlatformVersion();

    const filter = {
        urls: ['*://accounts.google.com/*', '*://ogs.google.com/*'],
    };

    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
        const headers = {};
        for (const [key, value] of Object.entries(details.requestHeaders)) {
            const lower = key.toLowerCase();
            if (lower === 'user-agent' || lower === 'accept-language' || lower.startsWith('sec-ch-ua')) {
                continue;
            }
            headers[lower] = value;
        }
        headers['user-agent'] = userAgent;
        headers['sec-ch-ua'] = `"Microsoft Edge";v="${majorVersion}", "Chromium";v="${majorVersion}", "Not_A Brand";v="99"`;
        headers['sec-ch-ua-mobile'] = '?0';
        headers['sec-ch-ua-platform'] = `"${platform}"`;
        headers['sec-ch-ua-platform-version'] = `"${platformVersion}"`;
        headers['sec-ch-ua-arch'] = '"x86"';
        headers['sec-ch-ua-bitness'] = '"64"';
        headers['sec-ch-ua-full-version-list'] = `"Microsoft Edge";v="${chromeVersion}", "Chromium";v="${chromeVersion}", "Not_A Brand";v="99.0.0.0"`;
        headers['sec-ch-ua-full-version'] = `"${chromeVersion}"`;
        headers['sec-ch-ua-model'] = '""';
        headers['sec-ch-ua-wow64'] = '?0';
        headers['sec-ch-ua-form-factors'] = '"Desktop"';
        callback({ requestHeaders: headers });
    });
}

module.exports = {
    getAuthUserAgent,
    getAuthPlatform,
    getAuthPlatformVersion,
    registerAuthHeaderSpoofing,
};
