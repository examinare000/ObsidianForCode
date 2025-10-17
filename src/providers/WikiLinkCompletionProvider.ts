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
     * Sets up a file system watcher to invalidate cache when files are created or deleted.
     * Note: File content changes (onDidChange) do not affect the cache since we only store
     * file titles, URIs, and paths - not content.
     */
    private setupFileWatcher(): void {
        const extension = this.configManager.getNoteExtension();
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(`**/*${extension}`);

        // Clear cache only when the file list changes (create/delete)
        // Content changes don't affect note titles, URIs, or paths
        this.fileWatcher.onDidCreate(() => this.clearCache());
        this.fileWatcher.onDidDelete(() => this.clearCache());
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
        const cacheKey = `${workspaceFolder.uri.fsPath}:${vaultRoot || ''}:${extension}`;

        // ensure cache container exists
        if (!this.noteCache) {
            this.noteCache = new Map();
        }

        // If the key changed (workspace/vault/extension), rebuild watcher and invalidate cache
        if (!this.fileWatcher || this.fileWatcher !== cacheKey) {
            // clear any cached notes for the old watcher key
            if (this.fileWatcher && this.noteCache.has(this.fileWatcher)) {
                this.noteCache.delete(this.fileWatcher);
            }

            // dispose previous watcher if present
            if (this.fileWatcher) {
                try { this.fileWatcher.dispose(); } catch { /* ignore */ }
                this.fileWatcher = undefined;
            }

            // create new watcher using the extension-aware glob
            const pattern = new vscode.RelativePattern(workspaceFolder, `**/*${extension}`);
            this.fileWatcher = workspaceFolder.createFileSystemWatcher(pattern);

            // set new watcher key and initialize cache entry
            this.fileWatcher = cacheKey;
            this.noteCache.set(cacheKey, []);
        }

        const notes = this.noteCache.get(cacheKey) || [];

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
     * Delegates to NoteFinder.filterNotesByPrefix for consistent filtering logic.
     */
    private filterNotesByPrefix(
        allNotes: { title: string; uri: vscode.Uri; relativePath: string }[],
        prefix: string,
        maxResults: number
    ): { title: string; uri: vscode.Uri; relativePath: string }[] {
        return NoteFinder.filterNotesByPrefix(allNotes, prefix, maxResults);
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
