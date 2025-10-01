/**
 * @fileoverview List and checkbox continuation provider for VS Code extension.
 * Automatically continues lists and checkboxes when pressing Enter in Markdown files.
 *
 * @author ObsidianForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import { ConfigurationManager } from '../managers/ConfigurationManager';

/**
 * Provides automatic list and checkbox continuation when pressing Enter.
 * Detects list patterns and continues them on the next line.
 *
 * @class ListContinuationProvider
 */
export class ListContinuationProvider {
    private configManager: ConfigurationManager;

    /**
     * Creates a new ListContinuationProvider instance.
     *
     * @param configManager - Configuration manager for accessing extension settings
     */
    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
    }

    /**
     * Handles the Enter key press event to continue lists and checkboxes.
     * Checks if the current line is a list or checkbox and continues it on the next line.
     *
     * @param editor - The active text editor
     * @returns Promise resolving to true if list was continued, false otherwise
     */
    async handleEnterKey(editor: vscode.TextEditor): Promise<boolean> {
        // Check if list continuation is enabled
        if (!this.configManager.getListContinuationEnabled()) {
            return false;
        }

        const document = editor.document;
        const selection = editor.selection;

        // Only handle single cursor positions
        if (!selection.isEmpty) {
            return false;
        }

        const position = selection.active;
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const textBeforeCursor = lineText.substring(0, position.character);

        // Detect list patterns
        const listPatterns = [
            // Unordered lists with -, *, +
            /^(\s*)([-*+])\s+(.*)$/,
            // Ordered lists with numbers
            /^(\s*)(\d+)\.\s+(.*)$/,
            // Checkboxes
            /^(\s*)([-*+])\s+\[([ x])\]\s+(.*)$/,
        ];

        let matchedPattern: RegExpExecArray | null = null;
        let patternType: 'unordered' | 'ordered' | 'checkbox' | null = null;

        // Check checkbox pattern first (more specific)
        const checkboxMatch = /^(\s*)([-*+])\s+\[([ x])\]\s+(.*)$/.exec(textBeforeCursor);
        if (checkboxMatch) {
            matchedPattern = checkboxMatch;
            patternType = 'checkbox';
        } else {
            // Check unordered list
            const unorderedMatch = /^(\s*)([-*+])\s+(.*)$/.exec(textBeforeCursor);
            if (unorderedMatch) {
                matchedPattern = unorderedMatch;
                patternType = 'unordered';
            } else {
                // Check ordered list
                const orderedMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(textBeforeCursor);
                if (orderedMatch) {
                    matchedPattern = orderedMatch;
                    patternType = 'ordered';
                }
            }
        }

        if (!matchedPattern || !patternType) {
            return false;
        }

        const indent = matchedPattern[1];

        // Check if the list item is empty (only the marker, no content)
        const contentAfterMarker = patternType === 'checkbox'
            ? matchedPattern[4]
            : matchedPattern[patternType === 'ordered' ? 3 : 3];

        if (!contentAfterMarker || contentAfterMarker.trim() === '') {
            // Empty list item - remove the list marker and outdent
            const edit = new vscode.WorkspaceEdit();

            // Replace the current line with an empty string
            const lineRange = new vscode.Range(
                position.line,
                0,
                position.line,
                line.text.length
            );
            edit.replace(document.uri, lineRange, '');

            await vscode.workspace.applyEdit(edit);

            // Move cursor to the beginning of the line
            const newPosition = new vscode.Position(position.line, 0);
            editor.selection = new vscode.Selection(newPosition, newPosition);

            // Return false to let VS Code's normal newline/typing behavior proceed
            return false;
        }

        // Continue the list
        let newLineContent = '';

        switch (patternType) {
            case 'checkbox': {
                const marker = matchedPattern[2];
                // Always create unchecked checkbox for new items
                newLineContent = `${indent}${marker} [ ] `;
                break;
            }

            case 'unordered': {
                const listMarker = matchedPattern[2];
                newLineContent = `${indent}${listMarker} `;
                break;
            }

            case 'ordered': {
                const number = parseInt(matchedPattern[2], 10);
                newLineContent = `${indent}${number + 1}. `;
                break;
            }
        }

        // Insert the new line with the continued list marker
        const edit = new vscode.WorkspaceEdit();

        // Insert at the end of the current line
        const endOfLine = new vscode.Position(position.line, line.text.length);
        edit.insert(document.uri, endOfLine, '\n' + newLineContent);

        await vscode.workspace.applyEdit(edit);

        // Move cursor to the end of the new list marker
        const newPosition = new vscode.Position(
            position.line + 1,
            newLineContent.length
        );
        editor.selection = new vscode.Selection(newPosition, newPosition);

        return true;
    }

    /**
     * Registers the list continuation provider with VS Code.
     * Sets up the event listener for Enter key presses in Markdown files.
     *
     * @param context - The extension context for managing subscriptions
     * @returns The disposable for the registered provider
     */
    register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand('obsd.handleEnterKey', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'markdown') {
                // Let VS Code handle the Enter key normally
                await vscode.commands.executeCommand('type', { text: '\n' });
                return;
            }

            const handled = await this.handleEnterKey(editor);
            if (!handled) {
                // If we didn't handle it, let VS Code handle it normally
                await vscode.commands.executeCommand('type', { text: '\n' });
            }
        });
    }
}