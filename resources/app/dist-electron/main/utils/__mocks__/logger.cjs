"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.mockLogger = void 0;
exports.resetMockLogger = resetMockLogger;
/**
 * Manual mock for the logger module.
 *
 * Vitest automatically uses files in __mocks__ directories when vi.mock() is called
 * for the parent module. This provides a centralized mock that all tests share.
 *
 * Usage in tests:
 * ```typescript
 * vi.mock('../../src/main/utils/logger'); // Uses this __mocks__ file automatically
 * import { mockLogger } from '../../src/main/utils/logger'; // Import for assertions
 *
 * // In test:
 * expect(mockLogger.warn).toHaveBeenCalledWith('some message');
 * ```
 *
 * @module src/main/utils/__mocks__/logger
 */
const vitest_1 = require("vitest");
/**
 * Mock logger instance with all logging methods.
 * Tests can import this directly to make assertions.
 */
exports.mockLogger = {
    log: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
    warn: vitest_1.vi.fn(),
    debug: vitest_1.vi.fn(),
};
/**
 * Mock createLogger function that returns the shared mockLogger.
 * This mirrors the real logger module's API.
 */
exports.createLogger = vitest_1.vi.fn().mockReturnValue(exports.mockLogger);
/**
 * Resets all mock functions. Call in beforeEach if needed.
 */
function resetMockLogger() {
    exports.mockLogger.log.mockClear();
    exports.mockLogger.error.mockClear();
    exports.mockLogger.warn.mockClear();
    exports.mockLogger.debug.mockClear();
    exports.createLogger.mockClear();
}
// Auto-reset between tests when this module is imported
(0, vitest_1.beforeEach)(() => {
    resetMockLogger();
});
