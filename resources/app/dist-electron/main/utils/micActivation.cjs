"use strict";
/**
 * Microphone Activation Utility for Gemini Voice Chat
 *
 * Provides a utility function to inject and execute a microphone button click
 * into the Gemini iframe, enabling voice input via hotkey activation.
 *
 * @module micActivation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateMicrophoneInFrame = activateMicrophoneInFrame;
const geminiSelectors_1 = require("./geminiSelectors.cjs");
/**
 * Activates the microphone input in the Gemini iframe by injecting and executing
 * a script that finds and clicks the microphone button.
 *
 * The script uses the standard selector chain from GEMINI_MICROPHONE_BUTTON_SELECTORS
 * and executes with userGesture=true to satisfy browser security policies for
 * microphone access.
 *
 * @param frame - The WebFrameMain instance representing the Gemini iframe
 * @returns Promise resolving to MicActivationResult indicating success or error
 *
 * @example
 * ```typescript
 * const frame = win.webContents.mainFrame;
 * const result = await activateMicrophoneInFrame(frame);
 * if (result.success) {
 *     console.log('Microphone activated');
 * } else {
 *     console.error('Microphone activation failed:', result.error);
 * }
 * ```
 */
async function activateMicrophoneInFrame(frame) {
    const injectionScript = `
(function() {
    'use strict';
    
    const LOG_PREFIX = '[MicActivation]';
    
    function log(level, message, ...args) {
        const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
        const prefix = LOG_PREFIX + ' [' + level.toUpperCase() + ']';
        console[method](prefix, message, ...args);
    }
    
    const logger = {
        debug: (msg, ...args) => log('debug', msg, ...args),
        info: (msg, ...args) => log('info', msg, ...args),
        warn: (msg, ...args) => log('warn', msg, ...args),
        error: (msg, ...args) => log('error', msg, ...args),
    };
    
    /**
     * Safely query for an element using multiple selectors.
     */
    function safeQuerySelector(selectors) {
        if (!Array.isArray(selectors) || selectors.length === 0) {
            logger.error('safeQuerySelector: Invalid selectors array');
            return null;
        }
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    logger.debug('Found microphone button with selector:', selector);
                    return element;
                }
            } catch (e) {
                logger.warn('Selector query failed:', selector, e.message);
            }
        }
        
        logger.debug('No microphone button found for selectors:', selectors);
        return null;
    }
    
    /**
     * Safely click an element.
     */
    function safeClick(element) {
        if (!element) {
            logger.warn('safeClick: No element provided');
            return false;
        }
        
        try {
            element.click();
            return true;
        } catch (e) {
            logger.warn('Failed to click element:', e.message);
            return false;
        }
    }
    
    const result = {
        success: false,
        error: null
    };
    
    try {
        logger.info('Starting microphone button activation');
        
        const selectors = ${JSON.stringify(geminiSelectors_1.GEMINI_MICROPHONE_BUTTON_SELECTORS)};
        
        const micButton = safeQuerySelector(selectors);
        if (!micButton) {
            result.error = 'microphone_button_not_found';
            logger.error('Microphone button not found');
            return result;
        }
        
        if (safeClick(micButton)) {
            result.success = true;
            logger.info('Microphone button clicked successfully');
        } else {
            result.error = 'click_failed';
            logger.error('Failed to click microphone button');
        }
    } catch (e) {
        result.error = e.message || 'unknown_error';
        logger.error('Microphone activation failed:', e);
    }
    
    return result;
})();
    `.trim();
    try {
        const result = await frame.executeJavaScript(injectionScript, true); // userGesture: true
        return result;
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
