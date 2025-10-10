/**
 * @fileoverview WikiLink completion provider for VS Code extension.
 * Provides intelligent autocomplete suggestions for WikiLink references
 * based on existing notes in the workspace.
 *
 * @author ObsidianForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import { NoteFinder } from '../utils/NoteFinder';
import { ConfigurationManager } from '../managers/ConfigurationManager';

/**
 * Provides completion items for WikiLink references in Markdown files.
 * Suggests existing note titles when typing inside [[]] brackets.
 *
 * @class WikiLinkCompletionProvider
 * @implements {vscode.CompletionItemProvider}
 */
export class WikiLinkCompletionProvider implements vscode.CompletionItemProvider {
    private configManager: ConfigurationManager;
    private noteCache: Map<string, { title: string; uri: vscode.Uri; relativePath: string }[]> | null = null;
    private fileWatcher: vscode.FileSystemWatcher | null = null;

    /**
     * Creates a new WikiLinkCompletionProvider instance.
     *
     * @param configManager - Configuration manager for accessing extension settings
     */
    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        this.setupFileWatcher();
    }

    /**
     * Sets up a file system watcher to invalidate cache on file changes.
     */
    private setupFileWatcher(): void {
        const extension = this.configManager.getNoteExtension();
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(`**/*${extension}`);

        // Clear cache on any file change
        this.fileWatcher.onDidCreate(() => this.clearCache());
        this.fileWatcher.onDidDelete(() => this.clearCache());
        this.fileWatcher.onDidChange(() => this.clearCache());
    }

    /**
     * Clears the note cache.
     */
    private clearCache(): void {
        this.noteCache = null;
    }

    /**
     * Gets all notes from cache or loads them if cache is empty.
     */
    private async getAllNotesWithCache(
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot: string | undefined,
        extension: string
    ): Promise<{ title: string; uri: vscode.Uri; relativePath: string }[]> {
        const cacheKey = `${workspaceFolder.uri.fsPath}:${vaultRoot || ''}`;

        if (this.noteCache && this.noteCache.has(cacheKey)) {
            return this.noteCache.get(cacheKey)!;
        }

        // Load all notes
        const allNotes = await NoteFinder.getAllNotes(workspaceFolder, vaultRoot, extension);

        // Cache the results
        if (!this.noteCache) {
            this.noteCache = new Map();
        }
        this.noteCache.set(cacheKey, allNotes);

        return allNotes;
    }

    /**
     * Filters notes by prefix from the cached list.
     */
    private filterNotesByPrefix(
        allNotes: { title: string; uri: vscode.Uri; relativePath: string }[],
        prefix: string,
        maxResults: number
    ): { title: string; uri: vscode.Uri; relativePath: string }[] {
        if (!prefix) {
            return allNotes.slice(0, maxResults);
        }

        // Parse directory path and file prefix
        const lastSlashIndex = prefix.lastIndexOf('/');
        const directoryPath = lastSlashIndex >= 0 ? prefix.substring(0, lastSlashIndex) : '';
        const filePrefix = lastSlashIndex >= 0 ? prefix.substring(lastSlashIndex + 1) : prefix;

        interface ResultWithMatchType {
            title: string;
            uri: vscode.Uri;
            relativePath: string;
            matchType: 'exact' | 'filePrefix' | 'dirPrefix';
        }

        const resultsWithType: ResultWithMatchType[] = [];

        for (const note of allNotes) {
            const fileNameMatches = note.title.toLowerCase().startsWith(filePrefix.toLowerCase());
            const exactMatch = note.title.toLowerCase() === filePrefix.toLowerCase();

            // Check if any directory in the path matches the prefix
            let directoryMatches = false;
            if (!directoryPath && filePrefix) {
                const pathSegments = note.relativePath.split('/');
                for (let i = 0; i < pathSegments.length - 1; i++) {
                    if (pathSegments[i].toLowerCase().startsWith(filePrefix.toLowerCase())) {
                        directoryMatches = true;
                        break;
                    }
                }
            }

            if (fileNameMatches || directoryMatches) {
                // If directory path is specified, ensure the file is in that directory
                if (directoryPath) {
                    const normalizedRelativePath = note.relativePath.replace(/\\/g, '/').toLowerCase();
                    const normalizedDirectoryPath = directoryPath.toLowerCase();
                    if (!normalizedRelativePath.startsWith(normalizedDirectoryPath + '/')) {
                        continue;
                    }
                }

                let matchType: 'exact' | 'filePrefix' | 'dirPrefix';
                if (exactMatch) {
                    matchType = 'exact';
                } else if (fileNameMatches) {
                    matchType = 'filePrefix';
                } else {
                    matchType = 'dirPrefix';
                }

                resultsWithType.push({
                    ...note,
                    matchType
                });
            }
        }

        // Sort by relevance
        resultsWithType.sort((a, b) => {
            const matchTypeOrder = { exact: 0, filePrefix: 1, dirPrefix: 2 };
            const aOrder = matchTypeOrder[a.matchType];
            const bOrder = matchTypeOrder[b.matchType];
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }

            const aDepth = a.relativePath.split('/').length;
            const bDepth = b.relativePath.split('/').length;
            if (aDepth !== bDepth) {
                return aDepth - bDepth;
            }

            return a.title.localeCompare(b.title);
        });

        return resultsWithType.slice(0, maxResults);
    }

    /**
     * Disposes of resources used by this provider.
     */
    dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }
        this.clearCache();
    }

    /**
     * Provides completion items for WikiLink references.
     * Triggered when typing inside [[]] brackets in a Markdown file.
     *
     * @param document - The current text document
     * @param position - The cursor position where completion was triggered
     * @param token - Cancellation token
     * @param context - Additional context about how completion was triggered
     * @returns Array of completion items or null if not in a WikiLink context
     */
    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | null> {
        // Check if we're inside WikiLink brackets
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        // Find the last [[ before cursor
        const lastOpenBrackets = textBeforeCursor.lastIndexOf('[[');
        if (lastOpenBrackets === -1) {
            return null;
        }

        // Check if there's a closing ]] after the opening [[
        const textAfterOpen = lineText.substring(lastOpenBrackets);
        const closeBrackets = textAfterOpen.indexOf(']]');

        // We're not inside WikiLink if ]] appears before cursor position
        if (closeBrackets !== -1 && lastOpenBrackets + closeBrackets < position.character) {
            return null;
        }

        const linkContentStart = lastOpenBrackets + 2;
        const cursorOffsetInLink = position.character - linkContentStart;
        if (cursorOffsetInLink < 0) {
            return null;
        }

        const textInsideBeforeCursor = textBeforeCursor.substring(linkContentStart);
        const textInsideFull = lineText.substring(linkContentStart);

        const aliasIndexBeforeCursor = textInsideBeforeCursor.indexOf('|');
        const headingIndexBeforeCursor = textInsideBeforeCursor.indexOf('#');
        const aliasIndexInLink = textInsideFull.indexOf('|');
        const headingIndexInLink = textInsideFull.indexOf('#');

        if (aliasIndexInLink !== -1 && cursorOffsetInLink > aliasIndexInLink) {
            // Cursor is within alias portion; do not provide completions
            return null;
        }

        let prefixEndIndex = cursorOffsetInLink;
        if (aliasIndexBeforeCursor >= 0) {
            prefixEndIndex = Math.min(prefixEndIndex, aliasIndexBeforeCursor);
        }
        if (headingIndexBeforeCursor >= 0) {
            prefixEndIndex = Math.min(prefixEndIndex, headingIndexBeforeCursor);
        }

        const rawPrefix = textInsideBeforeCursor.substring(0, Math.max(0, prefixEndIndex));
        const searchPrefix = rawPrefix.trim();

        let replacementEnd = position.character;
        if (aliasIndexInLink >= 0) {
            replacementEnd = Math.min(replacementEnd, linkContentStart + aliasIndexInLink);
        } else if (headingIndexInLink >= 0) {
            replacementEnd = Math.min(replacementEnd, linkContentStart + headingIndexInLink);
        }

        replacementEnd = Math.max(replacementEnd, linkContentStart);

        // Get workspace folder for the current document
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return null;
        }

        // Get configuration
        const vaultRoot = this.configManager.getVaultRoot();
        const extension = this.configManager.getNoteExtension();

        // Get all notes from cache and filter by prefix
        const allNotes = await this.getAllNotesWithCache(workspaceFolder, vaultRoot, extension);
        const notes = this.filterNotesByPrefix(allNotes, searchPrefix, 50);

        // Convert to completion items
        const completionItems: vscode.CompletionItem[] = notes.map((note, index) => {
            const item = new vscode.CompletionItem(
                note.title,
                vscode.CompletionItemKind.File
            );

            // Set the text to be inserted
            item.insertText = note.title;

            // Add details about the file location
            item.detail = note.relativePath;

            // Add documentation
            item.documentation = new vscode.MarkdownString(
                `Link to: **${note.title}**\n\nPath: \`${note.relativePath}\``
            );

            // Set sort order (exact matches first)
            item.sortText = String(index).padStart(3, '0');

            const targetRange = new vscode.Range(
                new vscode.Position(position.line, linkContentStart),
                new vscode.Position(position.line, replacementEnd)
            );
            item.range = targetRange;

            return item;
        });

        return completionItems;
    }

    /**
     * Provides detailed resolution for a completion item.
     * Can be used to compute expensive details only when needed.
     *
     * @param item - The completion item to resolve
     * @param token - Cancellation token
     * @returns The resolved completion item
     */
    resolveCompletionItem?(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Currently, we provide all details upfront
        return item;
    }
}
