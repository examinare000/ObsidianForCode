/**
 * @fileoverview Note finder utility for searching notes across subdirectories.
 * Provides functionality to find notes by title with exact match support
 * for subdirectory traversal.
 *
 * @author ObsidianForCode Team
 * @version 1.0.0
 */

import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Utility class for finding notes across the workspace including subdirectories.
 * Supports exact title matching and provides efficient file search capabilities.
 *
 * @class NoteFinder
 */
export class NoteFinder {
    /**
     * Finds a note file by exact title match across all subdirectories.
     * Searches for markdown files matching the provided title in the workspace.
     *
     * @param title - The exact title of the note to find (without extension)
     * @param workspaceFolder - The workspace folder to search within
     * @param vaultRoot - Optional vault root path to constrain the search
     * @param extension - File extension to search for (default: '.md')
     * @returns Promise resolving to note information, or null if not found
     */
    static async findNoteByTitle(
        title: string,
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot?: string,
        extension: string = '.md'
    ): Promise<{ title: string; uri: vscode.Uri; relativePath: string } | null> {
        // Construct the search pattern
        const searchBase = vaultRoot && vaultRoot.trim() !== ''
            ? path.join(workspaceFolder.uri.fsPath, vaultRoot)
            : workspaceFolder.uri.fsPath;

        // Create glob pattern for recursive search
        const pattern = new vscode.RelativePattern(
            searchBase,
            `**/${title}${extension}`
        );

        try {
            // Find all matching files
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

            if (files.length > 0) {
                // Return the first match (prioritize root level if multiple matches)
                const sortedFiles = files.sort((a, b) => {
                    const aDepth = a.fsPath.split(path.sep).length;
                    const bDepth = b.fsPath.split(path.sep).length;
                    return aDepth - bDepth;
                });

                const file = sortedFiles[0];
                const relativePath = path.relative(searchBase, file.fsPath);
                return {
                    title: path.basename(file.fsPath, extension),
                    uri: file,
                    relativePath: relativePath
                };
            }
        } catch (error) {
            console.error('Error finding note:', error);
        }

        return null;
    }

    /**
     * Finds all notes with titles that start with the given prefix.
     * Useful for autocomplete suggestions in WikiLinks.
     * Supports directory filtering using slash notation (e.g., "folder/file").
     *
     * @param prefix - The prefix to match note titles against, optionally including directory path
     * @param workspaceFolder - The workspace folder to search within
     * @param vaultRoot - Optional vault root path to constrain the search
     * @param extension - File extension to search for (default: '.md')
     * @param maxResults - Maximum number of results to return (default: 50)
     * @returns Promise resolving to an array of matching note information
     */
    static async findNotesByPrefix(
        prefix: string,
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot?: string,
        extension: string = '.md',
        maxResults: number = 50
    ): Promise<{ title: string; uri: vscode.Uri; relativePath: string }[]> {
        const searchBase = vaultRoot && vaultRoot.trim() !== ''
            ? path.join(workspaceFolder.uri.fsPath, vaultRoot)
            : workspaceFolder.uri.fsPath;

        // Parse directory path and file prefix from the input
        const lastSlashIndex = prefix.lastIndexOf('/');
        const directoryPath = lastSlashIndex >= 0 ? prefix.substring(0, lastSlashIndex) : '';
        const filePrefix = lastSlashIndex >= 0 ? prefix.substring(lastSlashIndex + 1) : prefix;

        // Determine the search pattern based on whether a directory is specified
        let searchPath: string;
        let globPattern: string;

        if (directoryPath) {
            // Search only in the specified directory
            searchPath = path.join(searchBase, directoryPath);
            globPattern = `**/*${extension}`;
        } else {
            // Search in all directories (original behavior)
            searchPath = searchBase;
            globPattern = `**/*${extension}`;
        }

        const pattern = new vscode.RelativePattern(searchPath, globPattern);

        try {
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', maxResults * 2);

            const results: { title: string; uri: vscode.Uri; relativePath: string }[] = [];

            for (const file of files) {
                const fileName = path.basename(file.fsPath, extension);

                // Check if the file name starts with the file prefix (case-insensitive)
                if (fileName.toLowerCase().startsWith(filePrefix.toLowerCase())) {
                    // Calculate relative path from the original searchBase (not searchPath)
                    const relativePath = path.relative(searchBase, file.fsPath);

                    // If directory path is specified, ensure the file is in that directory
                    if (directoryPath) {
                        const normalizedRelativePath = relativePath.split(path.sep).join('/');
                        const normalizedDirectoryPath = directoryPath.split(path.sep).join('/');
                        if (!normalizedRelativePath.startsWith(normalizedDirectoryPath + '/')) {
                            continue;
                        }
                    }

                    results.push({
                        title: fileName,
                        uri: file,
                        relativePath: relativePath
                    });
                }
            }

            // Sort by relevance (exact match first, then by path depth, then alphabetically)
            results.sort((a, b) => {
                // Exact match (case-insensitive) comes first
                const aExact = a.title.toLowerCase() === filePrefix.toLowerCase();
                const bExact = b.title.toLowerCase() === filePrefix.toLowerCase();
                if (aExact && !bExact) {
                    return -1;
                }
                if (!aExact && bExact) {
                    return 1;
                }

                // Then sort by path depth (shallower first)
                const aDepth = a.relativePath.split(path.sep).length;
                const bDepth = b.relativePath.split(path.sep).length;
                if (aDepth !== bDepth) {
                    return aDepth - bDepth;
                }

                // Finally sort alphabetically
                return a.title.localeCompare(b.title);
            });

            // Return only the top maxResults entries
            return results.slice(0, maxResults);
        } catch (error) {
            console.error('Error finding notes by prefix:', error);
            return [];
        }
    }

    /**
     * Gets all note files in the workspace for indexing purposes.
     * Returns a list of all markdown files within the vault root.
     *
     * @param workspaceFolder - The workspace folder to search within
     * @param vaultRoot - Optional vault root path to constrain the search
     * @param extension - File extension to search for (default: '.md')
     * @returns Promise resolving to an array of note information
     */
    static async getAllNotes(
        workspaceFolder: vscode.WorkspaceFolder,
        vaultRoot?: string,
        extension: string = '.md'
    ): Promise<{ title: string; uri: vscode.Uri; relativePath: string }[]> {
        const searchBase = vaultRoot && vaultRoot.trim() !== ''
            ? path.join(workspaceFolder.uri.fsPath, vaultRoot)
            : workspaceFolder.uri.fsPath;

        const pattern = new vscode.RelativePattern(
            searchBase,
            `**/*${extension}`
        );

        try {
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
            return files.map(file => {
                const fileName = path.basename(file.fsPath, extension);
                const relativePath = path.relative(searchBase, file.fsPath);
                return {
                    title: fileName,
                    uri: file,
                    relativePath: relativePath
                };
            });
        } catch (error) {
            console.error('Error getting all notes:', error);
            return [];
        }
    }
}