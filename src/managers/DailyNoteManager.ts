/**
 * @fileoverview Daily note management functionality for MDloggerForCode extension.
 * Provides automated daily note creation, template management, and date-based file organization.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from './ConfigurationManager';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';

/**
 * Manages daily note creation and organization.
 * Handles file naming, path resolution, template loading, and automatic directory creation
 * for date-based notes following user configuration.
 *
 * @class DailyNoteManager
 */
export class DailyNoteManager {
    /**
     * Creates a new DailyNoteManager instance.
     *
     * @param configManager - Configuration manager for accessing daily note settings
     * @param dateTimeFormatter - Formatter for converting dates to file names
     */
    constructor(
        private configManager: ConfigurationManager,
        private dateTimeFormatter: DateTimeFormatter
    ) {}

    /**
     * Normalizes an absolute path for safe URI construction in remote environments.
     * Converts Windows backslashes to forward slashes and ensures proper URI path format.
     *
     * @param absolutePath - The absolute path to normalize
     * @returns Normalized path suitable for URI construction
     */
    private normalizeAbsolutePath(absolutePath: string): string {
        // Convert Windows backslashes to forward slashes
        let normalized = absolutePath.replace(/\\/g, '/');

        // Ensure single leading slash for absolute paths
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }

        // Remove duplicate slashes
        normalized = normalized.replace(/\/+/g, '/');

        return normalized;
    }

    /**
     * Generates a daily note file name for the specified date.
     * Uses the configured date format and note extension.
     *
     * @param date - The date to generate a file name for
     * @returns The formatted file name with extension
     */
    getDailyNoteFileName(date: Date): string {
        const dateFormat = this.configManager.getDateFormat();
        const formattedDate = this.dateTimeFormatter.formatDate(date, dateFormat);
        const extension = this.configManager.getNoteExtension();
        return `${formattedDate}${extension}`;
    }

    /**
     * Resolves the complete path for a daily note file.
     * Handles both absolute and relative vault root paths, combining them with
     * the daily note directory and generated file name.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param date - The date for the daily note
     * @returns Complete URI for the daily note file
     */
    getDailyNotePath(workspaceFolder: vscode.WorkspaceFolder, date: Date): vscode.Uri {
        const fileName = this.getDailyNoteFileName(date);
        const dailyNotePath = this.configManager.getDailyNotePath();
        const vaultRoot = this.configManager.getVaultRoot();

        if (vaultRoot && vaultRoot.trim() !== '') {
            if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                // 絶対パスの場合、ワークスペースのスキーム（file://、vscode-remote://など）を保持
                // リモート環境でも正しく動作するように、ワークスペースURIのスキームを使用
                const scheme = workspaceFolder.uri.scheme;
                if (scheme === 'file') {
                    return vscode.Uri.file(`${vaultRoot}/${dailyNotePath}/${fileName}`);
                } else {
                    // リモート環境の場合、正規化されたパスでURIを構築
                    const normalizedVaultRoot = this.normalizeAbsolutePath(vaultRoot);
                    const fullPath = `${normalizedVaultRoot}/${dailyNotePath}/${fileName}`;
                    return workspaceFolder.uri.with({ path: fullPath });
                }
            } else {
                return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, dailyNotePath, fileName);
            }
        } else {
            return vscode.Uri.joinPath(workspaceFolder.uri, dailyNotePath, fileName);
        }
    }

    /**
     * Resolves the directory URI containing all daily notes.
     * Mirrors getDailyNotePath logic but without appending the file name so other
     * features (e.g. task collection) can scope operations to the configured folder.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @returns URI pointing to the daily note directory
     */
    getDailyNoteDirectory(workspaceFolder: vscode.WorkspaceFolder): vscode.Uri {
        const dailyNotePath = this.configManager.getDailyNotePath();
        const vaultRoot = this.configManager.getVaultRoot();

        if (vaultRoot && vaultRoot.trim() !== '') {
            if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                const scheme = workspaceFolder.uri.scheme;
                if (scheme === 'file') {
                    return vscode.Uri.file(`${vaultRoot}/${dailyNotePath}`);
                } else {
                    const normalizedVaultRoot = this.normalizeAbsolutePath(vaultRoot);
                    const fullPath = `${normalizedVaultRoot}/${dailyNotePath}`;
                    return workspaceFolder.uri.with({ path: fullPath });
                }
            } else {
                return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, dailyNotePath);
            }
        }

        return vscode.Uri.joinPath(workspaceFolder.uri, dailyNotePath);
    }

    /**
     * Loads template content from the configured template file.
     * Attempts to read the daily note template file and returns its content.
     * Returns empty string if template file is not found or not configured.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @returns Promise resolving to template content or empty string
     * @throws {Error} When template file cannot be read (non-existence is handled gracefully)
     */
    async getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const templatePath = this.configManager.getDailyNoteTemplate();

        if (!templatePath || templatePath.trim() === '') {
            return '';
        }

        try {
            const vaultRoot = this.configManager.getVaultRoot();
            let templateUri: vscode.Uri;

            if (vaultRoot && vaultRoot.trim() !== '') {
                if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                    // 絶対パスの場合、ワークスペースのスキームを保持
                    const scheme = workspaceFolder.uri.scheme;
                    if (scheme === 'file') {
                        templateUri = vscode.Uri.file(`${vaultRoot}/${templatePath}`);
                    } else {
                        // リモート環境の場合、正規化されたパスでURIを構築
                        const normalizedVaultRoot = this.normalizeAbsolutePath(vaultRoot);
                        const fullPath = `${normalizedVaultRoot}/${templatePath}`;
                        templateUri = workspaceFolder.uri.with({ path: fullPath });
                    }
                } else {
                    templateUri = vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, templatePath);
                }
            } else {
                templateUri = vscode.Uri.joinPath(workspaceFolder.uri, templatePath);
            }

            const data = await vscode.workspace.fs.readFile(templateUri);
            return new TextDecoder().decode(data);
        } catch (error) {
            // テンプレートファイルが見つからない場合は空文字列を返す
            return '';
        }
    }

    /**
     * Opens an existing daily note or creates a new one for the specified date.
     * Main entry point for daily note functionality. Handles file existence checking,
     * directory creation, template application, and file opening.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param date - The date for the daily note (defaults to current date)
     * @throws {Error} When file creation or opening fails
     */
    async openOrCreateDailyNote(workspaceFolder: vscode.WorkspaceFolder, date: Date = new Date()): Promise<void> {
        const dailyNoteUri = this.getDailyNotePath(workspaceFolder, date);

        try {
            // ファイルが既に存在するかチェック
            await vscode.workspace.fs.stat(dailyNoteUri);
            // 存在する場合はそのまま開く
            await vscode.window.showTextDocument(dailyNoteUri);
        } catch {
            // ファイルが存在しない場合は新規作成
            const templateContent = await this.getTemplateContent(workspaceFolder);
            const data = new TextEncoder().encode(templateContent);

            // ディレクトリが存在しない場合は作成
            // 元のURIのスキームを保持して親ディレクトリURIを作成
            const uriPath = dailyNoteUri.path || dailyNoteUri.fsPath;
            const dirPath = path.dirname(uriPath);
            const dirUri = dailyNoteUri.with({ path: dirPath });
            await vscode.workspace.fs.createDirectory(dirUri);

            // ファイル作成
            await vscode.workspace.fs.writeFile(dailyNoteUri, data);

            // 新しいタブで開く
            await vscode.window.showTextDocument(dailyNoteUri);
        }
    }

    /**
     * Appends a captured line to a named section inside today's daily note.
     * If the daily note or the section does not exist, they will be created.
     *
     * @param workspaceFolder - The VS Code workspace folder
     * @param content - The content to append (single-line)
     * @param sectionName - Optional section heading to append into. If omitted, uses ConfigurationManager.getCaptureSectionName().
     * @param date - Optional date for which daily note to append (defaults to today)
     * @returns Promise resolving to the inserted line index and target URI
     */
    async appendToSection(
        workspaceFolder: vscode.WorkspaceFolder,
        content: string,
        sectionName?: string,
        date: Date = new Date()
    ): Promise<{ uri: vscode.Uri; line: number }> {
        const targetSection = sectionName || this.configManager.getCaptureSectionName();
        const dailyUri = this.getDailyNotePath(workspaceFolder, date);

        // Ensure file exists (creates if necessary)
        await this.openOrCreateDailyNote(workspaceFolder, date);

        // Read file
        const raw = await vscode.workspace.fs.readFile(dailyUri);
        const text = new TextDecoder().decode(raw);
        const lines = text.split(/\r?\n/);

        // Find the section heading (match heading lines like # Heading or ## Heading)
        const escaped = targetSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const headingRegex = new RegExp(`^#{1,6}\\s*${escaped}\\s*$`, 'i');

        let insertLine = lines.length; // default append at end
        let found = false;

        for (let i = 0; i < lines.length; i++) {
            if (headingRegex.test(lines[i])) {
                found = true;
                // find next heading index
                let j = i + 1;
                for (; j < lines.length; j++) {
                    if (/^#{1,6}\s+/.test(lines[j])) {
                        break;
                    }
                }
                insertLine = j; // insert before next heading (or at EOF)
                break;
            }
        }

        // If section not found, append heading and then the content
        if (!found) {
            lines.push('');
            lines.push(`## ${targetSection}`);
            insertLine = lines.length; // after the new heading
        }

        // Create the capture line with timestamp
        const timeFormat = this.configManager.getTimeFormat();
        const timeString = this.dateTimeFormatter.formatTime(new Date(), timeFormat);
        const lineText = `- [ ] ${timeString} — ${content}`;

        // Insert the new line
        lines.splice(insertLine, 0, lineText);

        // Write back
        const newText = lines.join('\n');
        await vscode.workspace.fs.writeFile(dailyUri, new TextEncoder().encode(newText));

        return { uri: dailyUri, line: insertLine };
    }
}
