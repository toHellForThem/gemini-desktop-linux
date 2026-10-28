"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger.cjs");
const ipc_channels_1 = require("../../shared/constants/ipc-channels.cjs");
const chatExtraction_1 = require("../utils/chatExtraction.cjs");
const turndown_1 = __importDefault(require("turndown"));
const turndown_plugin_gfm_1 = require("turndown-plugin-gfm");
const marked_1 = require("marked");
const logger = (0, logger_1.createLogger)('[ExportManager]');
const isChatTurn = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    const hasValidRole = candidate.role === 'user' || candidate.role === 'model';
    const hasValidText = typeof candidate.text === 'string';
    const hasValidHtml = candidate.html === undefined || typeof candidate.html === 'string';
    return hasValidRole && hasValidText && hasValidHtml;
};
const isChatData = (data) => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const candidate = data;
    if (!Array.isArray(candidate.conversation)) {
        return false;
    }
    return (typeof candidate.title === 'string' &&
        typeof candidate.timestamp === 'string' &&
        candidate.conversation.every((turn) => isChatTurn(turn)));
};
class ExportManager {
    turndown;
    constructor() {
        this.turndown = new turndown_1.default({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
        });
        this.turndown.use(turndown_plugin_gfm_1.gfm);
    }
    /**
     * Allowed domains for Gemini content extraction.
     * The hostname must match exactly or be a subdomain of these.
     */
    static ALLOWED_DOMAINS = ['gemini.google.com', 'aistudio.google.com'];
    /**
     * Checks if a hostname matches an allowed domain exactly or is a subdomain.
     * Uses domain part comparison to prevent substring bypass attacks.
     */
    isHostnameAllowed(hostname) {
        const hostParts = hostname.toLowerCase().split('.');
        for (const domain of ExportManager.ALLOWED_DOMAINS) {
            const domainParts = domain.split('.');
            // Check if hostname has enough parts and the rightmost parts match exactly
            if (hostParts.length >= domainParts.length) {
                const hostSuffix = hostParts.slice(-domainParts.length);
                if (hostSuffix.every((part, i) => part === domainParts[i])) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Checks if a URL is from an allowed Gemini domain.
     * Uses proper URL parsing to prevent bypass attacks.
     */
    isAllowedGeminiUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return this.isHostnameAllowed(parsedUrl.hostname);
        }
        catch {
            return false;
        }
    }
    /**
     * Extracts chat data from the provided WebContents.
     */
    async extractChatData(webContents) {
        try {
            // Find the Gemini frame
            const mainFrameUrl = webContents.getURL();
            let targetFrame = null;
            if (this.isAllowedGeminiUrl(mainFrameUrl)) {
                targetFrame = webContents.mainFrame;
            }
            else {
                const frames = webContents.mainFrame.frames;
                logger.debug('Available frames:', frames.map((f) => f.url));
                const geminiFrame = frames.find((frame) => this.isAllowedGeminiUrl(frame.url));
                if (geminiFrame)
                    targetFrame = geminiFrame;
            }
            if (!targetFrame) {
                logger.error('Gemini frame not found for extraction');
                return null;
            }
            const data = (await targetFrame.executeJavaScript(chatExtraction_1.CHAT_EXTRACTION_SCRIPT));
            logger.debug('Extracted data:', JSON.stringify(data, null, 2));
            if (data && typeof data === 'object' && 'error' in data) {
                logger.error('Extraction script returned error:', data.error);
                return null;
            }
            if (isChatData(data) && data.conversation.length === 0) {
                logger.warn('Extraction successful but conversation is empty. Diagnostics:', JSON.stringify(typeof data === 'object' && data && 'diagnostics' in data
                    ? data.diagnostics
                    : undefined, null, 2));
            }
            return isChatData(data) ? data : null;
        }
        catch (error) {
            logger.error('Failed to extract chat data:', error);
            return null;
        }
    }
    /**
     * Exports chat to Markdown.
     */
    async exportToMarkdown(webContents) {
        const data = await this.extractChatData(webContents);
        if (!data) {
            webContents.send(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW, { message: 'Failed to extract chat data', type: 'error' });
            return;
        }
        let markdown = `# ${data.title}\n\n*Exported on ${new Date(data.timestamp).toLocaleString()}*\n\n---\n\n`;
        for (const turn of data.conversation) {
            const role = turn.role === 'user' ? '## You' : '## Gemini';
            const content = turn.html ? this.turndown.turndown(turn.html) : turn.text;
            markdown += `${role}\n\n${content}\n\n---\n\n`;
        }
        const { filePath, canceled } = await electron_1.dialog.showSaveDialog({
            title: 'Save Chat as Markdown',
            defaultPath: path.join(electron_1.app.getPath('downloads'), `${data.title.replace(/\s+/g, '_').replace(/[/\\?%*:|"<>]/g, '-')}.md`),
            filters: [{ name: 'Markdown Files', extensions: ['md'] }],
        });
        if (canceled || !filePath)
            return;
        await fs.writeFile(filePath, markdown);
        webContents.send(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW, { message: 'Chat exported to Markdown', type: 'success' });
    }
    /**
     * Exports chat to PDF (High-fidelity rendered HTML).
     */
    async exportToPdf(webContents) {
        const data = await this.extractChatData(webContents);
        if (!data) {
            webContents.send(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW, { message: 'Failed to extract chat data', type: 'error' });
            return;
        }
        const { filePath, canceled } = await electron_1.dialog.showSaveDialog({
            title: 'Save Chat as PDF',
            defaultPath: path.join(electron_1.app.getPath('downloads'), `${data.title.replace(/\s+/g, '_').replace(/[/\\?%*:|"<>]/g, '-')}.pdf`),
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });
        if (canceled || !filePath)
            return;
        try {
            const htmlContent = this.generatePdfHtml(data);
            const pdfBuffer = await this.renderHtmlToPdf(htmlContent);
            await fs.writeFile(filePath, pdfBuffer);
            webContents.send(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW, { message: 'Chat exported to PDF', type: 'success' });
        }
        catch (error) {
            logger.error('Failed to generate PDF:', error);
            webContents.send(ipc_channels_1.IPC_CHANNELS.TOAST_SHOW, { message: 'Failed to generate PDF', type: 'error' });
        }
    }
    /**
     * Generates a professionally styled HTML document for the PDF.
     */
    generatePdfHtml(data) {
        const turnsHtml = data.conversation
            .map((turn) => {
            const roleLabel = turn.role === 'user' ? 'You' : 'Gemini';
            const roleClass = turn.role === 'user' ? 'user-role' : 'model-role';
            // Use the extracted HTML if available, otherwise convert Markdown to HTML
            const contentHtml = turn.html || marked_1.marked.parse(turn.text);
            return `
                <div class="chat-turn">
                    <div class="role-header ${roleClass}">${roleLabel}</div>
                    <div class="content">${contentHtml}</div>
                </div>
            `;
        })
            .join('');
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    background: #fff;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #eee;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                }
                .title {
                    font-size: 28px;
                    font-weight: bold;
                    margin: 0;
                    color: #1a1a1b;
                }
                .timestamp {
                    font-size: 14px;
                    color: #666;
                    margin-top: 8px;
                }
                .chat-turn {
                    margin-bottom: 40px;
                    page-break-inside: avoid;
                }
                .role-header {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 12px;
                    padding-bottom: 4px;
                    border-bottom: 1px solid #f0f0f0;
                }
                .user-role { color: #1a73e8; }
                .model-role { color: #1e1e1e; }
                .content {
                    font-size: 15px;
                    overflow-wrap: break-word;
                }
                pre {
                    background: #f6f8fa;
                    padding: 16px;
                    border-radius: 8px;
                    overflow-x: auto;
                    font-family: inherit;
                    border: 1px solid #e1e4e8;
                }
                code {
                    font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
                    font-size: 85%;
                    background: rgba(175, 184, 193, 0.2);
                    padding: 0.2em 0.4em;
                    border-radius: 6px;
                }
                pre code {
                    background: none;
                    padding: 0;
                    font-size: 13px;
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 16px 0;
                }
                th, td {
                    border: 1px solid #dfe2e5;
                    padding: 8px 12px;
                    text-align: left;
                }
                th { background-color: #f6f8fa; }
                tr:nth-child(even) { background-color: #fafbfc; }
                blockquote {
                    margin: 0 0 16px;
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: 0.25em solid #dfe2e5;
                }
                img { max-width: 100%; }
                @media print {
                    body { padding: 0; }
                    .chat-turn { page-break-inside: avoid; border-bottom: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="title">${data.title}</h1>
                <div class="timestamp">Exported on ${new Date(data.timestamp).toLocaleString()}</div>
            </div>
            <div class="conversation">
                ${turnsHtml}
            </div>
        </body>
        </html>
        `;
    }
    /**
     * Renders HTML content to a PDF buffer using a hidden BrowserWindow.
     */
    async renderHtmlToPdf(html) {
        const win = new electron_1.BrowserWindow({
            show: false,
            webPreferences: {
                offscreen: true,
            },
        });
        try {
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
            const data = await win.webContents.printToPDF({
                printBackground: true,
                margins: {
                    top: 1,
                    bottom: 1,
                    left: 1,
                    right: 1,
                },
                pageSize: 'A4',
            });
            return Buffer.from(data);
        }
        finally {
            win.destroy();
        }
    }
}
exports.default = ExportManager;
