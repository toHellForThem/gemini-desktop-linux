"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAB_FRAME_NAME_PREFIX = void 0;
exports.getTabFrameName = getTabFrameName;
exports.TAB_FRAME_NAME_PREFIX = 'gemini-tab-';
function getTabFrameName(tabId) {
    return `${exports.TAB_FRAME_NAME_PREFIX}${tabId}`;
}
