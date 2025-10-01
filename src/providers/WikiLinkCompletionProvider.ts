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

    /**
     * Creates a new WikiLinkCompletionProvider instance.
     *
     * @param configManager - Configuration manager for accessing extension settings
     */
    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
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

        // Extract the prefix typed so far
        const prefix = textBeforeCursor.substring(lastOpenBrackets + 2);

        // Get workspace folder for the current document
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return null;
        }

        // Get configuration
        const vaultRoot = this.configManager.getVaultRoot();
        const extension = this.configManager.getNoteExtension();

        // Find notes matching the prefix
        const notes = await NoteFinder.findNotesByPrefix(
            prefix,
            workspaceFolder,
            vaultRoot,
            extension,
            50 // Maximum suggestions
        );

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

            // Preserve the closing brackets if they exist
            const textAfterCursor = lineText.substring(position.character);
            if (textAfterCursor.startsWith(']]')) {
                // If ]] already exists, just replace the text inside
                item.range = new vscode.Range(
                    new vscode.Position(position.line, lastOpenBrackets + 2),
                    new vscode.Position(position.line, position.character)
                );
            }

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