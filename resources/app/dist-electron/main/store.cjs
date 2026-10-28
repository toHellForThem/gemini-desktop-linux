"use strict";
/**
 * Simple file-based settings store.
 *
 * Persists application settings to a JSON file in the user data directory.
 * This store is cross-platform compatible (Windows, macOS, Linux) as it uses
 * Electron's app.getPath('userData') which resolves correctly on all platforms.
 *
 * @module SettingsStore
 * @example
 * const store = new SettingsStore<UserPreferences>({
 *     configName: 'user-preferences',
 *     defaults: { theme: 'system' }
 * });
 * store.set('theme', 'dark');
 * const theme = store.get('theme'); // 'dark'
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
exports.deepMerge = deepMerge;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = require("./utils/logger.cjs");
const logger = (0, logger_1.createLogger)('[SettingsStore]');
/**
 * Deep merge two objects, with source values taking precedence.
 * Arrays and non-object values in source replace target values entirely.
 *
 * SECURITY: This function filters out dangerous keys like __proto__, constructor,
 * and prototype to prevent prototype pollution attacks.
 *
 * @param target - The base object (defaults)
 * @param source - The object to merge in (loaded settings)
 * @returns Merged object with source values taking precedence
 */
function deepMerge(target, source) {
    const result = { ...target };
    // Dangerous keys that could lead to prototype pollution
    const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
    for (const key of Object.keys(source)) {
        // Skip dangerous keys to prevent prototype pollution
        if (dangerousKeys.has(String(key))) {
            continue;
        }
        const sourceValue = source[key];
        const targetValue = target[key];
        // If both values are plain objects (not arrays, not null), merge recursively
        if (typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(sourceValue) &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            !Array.isArray(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else {
            // Otherwise, source value takes precedence
            result[key] = sourceValue;
        }
    }
    return result;
}
/**
 * A simple JSON-based settings store for Electron applications.
 * Automatically handles file I/O with graceful error handling.
 *
 * @template T - The type of settings data stored
 */
class SettingsStore {
    _path;
    _defaults;
    _fs;
    _data;
    /**
     * Creates a new SettingsStore instance.
     * @param opts - Configuration options
     */
    constructor(opts = {}) {
        if (!opts.configName) {
            logger.error('Missing required configName option');
            opts.configName = 'settings';
        }
        const userDataPath = electron_1.app.getPath('userData');
        this._path = path.join(userDataPath, opts.configName + '.json');
        this._defaults = opts.defaults || {};
        /* v8 ignore next -- production fallback, tests always inject mock fs */
        this._fs = opts.fs || fs;
        this._data = this._loadData();
        logger.log(`Initialized at: ${this._path}`);
    }
    /**
     * Load data from the settings file.
     * Falls back to defaults if file doesn't exist or is corrupted.
     * @private
     * @returns Parsed settings data or defaults
     */
    _loadData() {
        try {
            const fileContent = this._fs.readFileSync(this._path, 'utf-8');
            const parsed = JSON.parse(fileContent);
            logger.log('Loaded existing settings');
            return deepMerge(this._defaults, parsed);
        }
        catch (error) {
            const err = error;
            if (err.code === 'ENOENT') {
                logger.log('No existing settings file, using defaults');
            }
            else {
                logger.error('Error reading settings file:', {
                    error: err.message,
                    code: err.code,
                    path: this._path,
                });
            }
            return { ...this._defaults };
        }
    }
    /**
     * Get a setting value by key.
     * @param key - The setting key
     * @returns The setting value, or undefined if not found
     */
    get(key) {
        return this._data ? this._data[key] : undefined;
    }
    /**
     * Set a setting value and persist to disk.
     * @param key - The setting key
     * @param val - The value to store
     * @returns True if save succeeded, false otherwise
     */
    set(key, val) {
        this._data[key] = val;
        return this._saveData();
    }
    /**
     * Save current data to disk.
     * @private
     * @returns True if save succeeded, false otherwise
     */
    _saveData() {
        try {
            this._fs.writeFileSync(this._path, JSON.stringify(this._data, null, 2), 'utf-8');
            return true;
        }
        catch (error) {
            const err = error;
            logger.error('Failed to save settings:', {
                error: err.message,
                code: err.code,
                path: this._path,
                data: this._data,
            });
            return false;
        }
    }
    /**
     * Get all settings as an object.
     * @returns All current settings
     */
    getAll() {
        return { ...this._data };
    }
    /**
     * Reset all settings to defaults.
     * @returns True if save succeeded, false otherwise
     */
    reset() {
        this._data = { ...this._defaults };
        return this._saveData();
    }
}
exports.default = SettingsStore;
