"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportIpcHandler = void 0;
const electron_1 = require("electron");
const BaseIpcHandler_1 = require("./BaseIpcHandler.cjs");
const ipc_channels_1 = require("../../../shared/constants/ipc-channels.cjs");
class ExportIpcHandler extends BaseIpcHandler_1.BaseIpcHandler {
    register() {
        // IPC Handlers
        electron_1.ipcMain.on(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_PDF, (event) => {
            this._handleExportPdf(event);
        });
        electron_1.ipcMain.on(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_MARKDOWN, (event) => {
            this._handleExportMarkdown(event);
        });
        // Window Event Listeners
        this.deps.windowManager.on('print-to-pdf-triggered', () => {
            this.logger.log('Export to PDF triggered via WindowManager event');
            if (!this.deps.exportManager) {
                this.logger.error('ExportManager not initialized');
                return;
            }
            const win = this.deps.windowManager.getMainWindow();
            if (win && !win.isDestroyed()) {
                this.deps.exportManager.exportToPdf(win.webContents).catch((err) => {
                    this.handleError('exportToPdf (local)', err);
                });
            }
            else {
                this.logger.warn('Cannot export to PDF: Main window not found or destroyed');
            }
        });
        this.deps.windowManager.on('export-markdown-triggered', () => {
            this.logger.log('Export to Markdown triggered via WindowManager event');
            if (!this.deps.exportManager) {
                this.logger.error('ExportManager not initialized');
                return;
            }
            const win = this.deps.windowManager.getMainWindow();
            if (win && !win.isDestroyed()) {
                this.deps.exportManager.exportToMarkdown(win.webContents).catch((err) => {
                    this.handleError('exportToMarkdown (local)', err);
                });
            }
            else {
                this.logger.warn('Cannot export to Markdown: Main window not found or destroyed');
            }
        });
    }
    unregister() {
        electron_1.ipcMain.removeAllListeners(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_PDF);
        electron_1.ipcMain.removeAllListeners(ipc_channels_1.IPC_CHANNELS.EXPORT_CHAT_MARKDOWN);
        this.deps.windowManager.removeAllListeners('print-to-pdf-triggered');
        this.deps.windowManager.removeAllListeners('export-markdown-triggered');
    }
    _handleExportPdf(event) {
        this.logger.log('Export to PDF triggered via IPC');
        if (!this.deps.exportManager) {
            this.logger.error('ExportManager not initialized');
            return;
        }
        this.deps.exportManager.exportToPdf(event.sender).catch((err) => {
            this.handleError('exportToPdf', err);
        });
    }
    _handleExportMarkdown(event) {
        this.logger.log('Export to Markdown triggered via IPC');
        if (!this.deps.exportManager) {
            this.logger.error('ExportManager not initialized');
            return;
        }
        this.deps.exportManager.exportToMarkdown(event.sender).catch((err) => {
            this.handleError('exportToMarkdown', err);
        });
    }
}
exports.ExportIpcHandler = ExportIpcHandler;
