"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GITHUB_RELEASES_URL = void 0;
exports.getReleaseNotesUrl = getReleaseNotesUrl;
const urls_1 = require("../constants/urls.cjs");
exports.GITHUB_RELEASES_URL = `${urls_1.GITHUB_REPO_URL}/releases`;
function getReleaseNotesUrl(version) {
    const trimmedVersion = version?.trim();
    if (!trimmedVersion) {
        return `${exports.GITHUB_RELEASES_URL}/latest`;
    }
    if (trimmedVersion.startsWith('v')) {
        return `${exports.GITHUB_RELEASES_URL}/tag/${trimmedVersion}`;
    }
    return `${exports.GITHUB_RELEASES_URL}/tag/v${trimmedVersion}`;
}
