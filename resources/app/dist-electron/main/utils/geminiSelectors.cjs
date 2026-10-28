"use strict";
/**
 * Gemini DOM Selectors Module
 *
 * Centralizes all CSS selectors for interacting with the Gemini website.
 * Designed for easy updates when gemini.google.com changes its DOM structure.
 *
 * MAINTENANCE GUIDE:
 * - When Gemini changes, update selectors here
 * - Run E2E tests to verify: npm run test:e2e
 * - Update GEMINI_SELECTORS_LAST_VERIFIED after manual verification
 *
 * @module geminiSelectors
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_CONVERSATION_TITLE_SELECTORS = exports.GEMINI_MICROPHONE_ERROR_TEXT = exports.GEMINI_ERROR_TOAST_SELECTORS = exports.GEMINI_MICROPHONE_BUTTON_SELECTORS = exports.GEMINI_SUBMIT_DELAY_MS = exports.GEMINI_EDITOR_BLANK_CLASS = exports.GEMINI_SUBMIT_BUTTON_SELECTORS = exports.GEMINI_EDITOR_SELECTORS = exports.GEMINI_DOMAIN = exports.GeminiSelectors = exports.GEMINI_SELECTORS_LAST_VERIFIED = exports.GEMINI_SELECTORS_VERSION = void 0;
exports.findGeminiElement = findGeminiElement;
exports.isGeminiDomain = isGeminiDomain;
/**
 * Version of the selector configuration.
 * Increment when making breaking changes to selector structure.
 */
exports.GEMINI_SELECTORS_VERSION = '1.0.0';
/**
 * Date when selectors were last manually verified against gemini.google.com.
 * Update this after confirming selectors work on the live site.
 */
exports.GEMINI_SELECTORS_LAST_VERIFIED = '2025-12-23';
/**
 * Gemini selector configuration organized by component.
 * Each component has:
 * - selectors: Array of CSS selectors in priority order (first match wins)
 * - description: Human-readable description for debugging
 * - Additional component-specific properties
 */
exports.GeminiSelectors = {
    /**
     * Domain for matching Gemini iframe URLs.
     */
    domain: 'gemini.google.com',
    /**
     * Legacy domain that may still appear in some URLs.
     */
    legacyDomain: 'bard.google.com',
    /**
     * Chat input editor configuration.
     * Gemini uses Quill.js for the rich text editor.
     */
    editor: {
        /**
         * CSS selectors for finding the chat input editor.
         * Ordered by specificity - first match wins.
         */
        selectors: [
            '.ql-editor[contenteditable="true"]',
            '.ql-editor',
            '[contenteditable="true"][role="textbox"]',
        ],
        /**
         * CSS class that indicates the editor is empty/blank.
         * Must be removed when injecting text.
         */
        blankClass: 'ql-blank',
        /**
         * Description for logging/debugging.
         */
        description: 'Quill-based rich text editor',
    },
    /**
     * Submit/send button configuration.
     */
    submitButton: {
        /**
         * CSS selectors for finding the send message button.
         * Ordered by specificity - first match wins.
         */
        selectors: [
            'button.send-button[aria-label="Send message"]',
            'button.send-button',
            'button[aria-label="Send message"]',
        ],
        /**
         * Description for logging/debugging.
         */
        description: 'Send message button',
    },
    /**
     * Microphone button configuration.
     * Used for speech dictation / voice input.
     */
    microphoneButton: {
        /**
         * CSS selectors for finding the microphone button.
         * Ordered by specificity - first match wins.
         */
        selectors: [
            'button[data-node-type="speech_dictation_mic_button"]',
            'button[aria-label="Microphone"]',
            'speech-dictation-mic-button button',
        ],
        /**
         * Description for logging/debugging.
         */
        description: 'Speech dictation microphone button',
    },
    /**
     * Error toast / snackbar configuration.
     * Used to detect permission errors displayed to the user.
     */
    errorToast: {
        /**
         * CSS selectors for finding error toast messages.
         * Gemini uses Angular Material snackbar for toasts.
         */
        selectors: ['[matsnackbarlabel]', '.mat-mdc-snack-bar-label', '.mdc-snackbar__label'],
        /**
         * Error message text for microphone permission denied.
         * Used to detect if microphone access failed.
         */
        microphoneErrorText: 'Unable to access the microphone',
        /**
         * Description for logging/debugging.
         */
        description: 'Error toast / snackbar message',
    },
    /**
     * Timing configuration for DOM interactions.
     */
    timing: {
        /**
         * Delay in milliseconds before clicking submit after text injection.
         * Allows Angular/Quill to process the text injection.
         */
        submitDelayMs: 500,
        /**
         * Description for logging/debugging.
         */
        description: 'Delay timings for DOM interactions',
    },
    /**
     * Conversation title configuration.
     * Used for determining the default filename for exports.
     */
    conversationTitle: {
        /**
         * CSS selectors for finding the conversation title.
         */
        selectors: ['[data-test-id="conversation-title"]', '.conversation-title', 'span.conversation-title'],
        /**
         * Description for logging/debugging.
         */
        description: 'Conversation title element',
    },
};
/**
 * Find the first matching element from an array of selectors.
 * Logs which selector matched for debugging.
 *
 * @param document - The document to search in
 * @param selectors - Array of CSS selectors to try
 * @param componentName - Name of the component for logging (e.g., 'editor', 'submitButton')
 * @param logger - Optional logger function (defaults to console.log)
 * @returns The first matching element or null
 */
function findGeminiElement(document, selectors, componentName, logger) {
    const log = logger || console.log;
    for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        if (!selector) {
            continue;
        }
        const element = document.querySelector(selector);
        if (element) {
            if (i === 0) {
                log(`[GeminiSelectors] ${componentName}: Found with primary selector`);
            }
            else {
                log(`[GeminiSelectors] ${componentName}: Found with fallback selector #${i + 1}: "${selector}"`);
            }
            return element;
        }
    }
    log(`[GeminiSelectors] ${componentName}: No matching element found`);
    return null;
}
/**
 * Check if a URL belongs to a Gemini domain.
 * Uses proper URL parsing to prevent substring bypass attacks (CWE-20).
 *
 * @param url - URL string to check
 * @returns True if the URL is for Gemini
 */
function isGeminiDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        return (hostname === exports.GeminiSelectors.domain ||
            hostname.endsWith(`.${exports.GeminiSelectors.domain}`) ||
            hostname === exports.GeminiSelectors.legacyDomain ||
            hostname.endsWith(`.${exports.GeminiSelectors.legacyDomain}`) ||
            hostname === 'aistudio.google.com' ||
            hostname.endsWith('.aistudio.google.com'));
    }
    catch {
        // Invalid URL
        return false;
    }
}
// Re-export individual selector arrays for backwards compatibility
exports.GEMINI_DOMAIN = exports.GeminiSelectors.domain;
exports.GEMINI_EDITOR_SELECTORS = exports.GeminiSelectors.editor.selectors;
exports.GEMINI_SUBMIT_BUTTON_SELECTORS = exports.GeminiSelectors.submitButton.selectors;
exports.GEMINI_EDITOR_BLANK_CLASS = exports.GeminiSelectors.editor.blankClass;
exports.GEMINI_SUBMIT_DELAY_MS = exports.GeminiSelectors.timing.submitDelayMs;
exports.GEMINI_MICROPHONE_BUTTON_SELECTORS = exports.GeminiSelectors.microphoneButton.selectors;
exports.GEMINI_ERROR_TOAST_SELECTORS = exports.GeminiSelectors.errorToast.selectors;
exports.GEMINI_MICROPHONE_ERROR_TEXT = exports.GeminiSelectors.errorToast.microphoneErrorText;
exports.GEMINI_CONVERSATION_TITLE_SELECTORS = exports.GeminiSelectors.conversationTitle.selectors;
