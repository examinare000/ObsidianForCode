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
     * Filters an array of notes by prefix and returns sorted results.
     * This is a static helper method that can be used by both findNotesByPrefix and completion providers.
     *
     * @param notes - Array of notes to filter
     * @param prefix - The prefix to match note titles against, optionally including directory path
     * @param maxResults - Maximum number of results to return
     * @returns Array of filtered and sorted note information
     */
    static filterNotesByPrefix(
        notes: { title: string; uri: vscode.Uri; relativePath: string }[],
        prefix: string,
        maxResults: number
    ): { title: string; uri: vscode.Uri; relativePath: string }[] {
        if (!prefix) {
            return notes.slice(0, maxResults);
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

        for (const note of notes) {
            const fileNameMatches = note.title.toLowerCase().startsWith(filePrefix.toLowerCase());
            const exactMatch = note.title.toLowerCase() === filePrefix.toLowerCase();

            // Check if any directory in the path matches the prefix
            let directoryMatches = false;
            if (!directoryPath && filePrefix) {
                const pathSegments = note.relativePath.split(path.sep);
                for (let i = 0; i < pathSegments.length - 1; i++) {
                    if (pathSegments[i].toLowerCase().startsWith(filePrefix.toLowerCase())) {
                        directoryMatches = true;
                        break;
                    }
                }
            }

            if (fileNameMatches || directoryMatches) {
                // If directory path is specified, ensure the file is in that directory (case-insensitive)
                if (directoryPath) {
                    const normalizedRelativePath = note.relativePath.split(path.sep).join('/').toLowerCase();
                    const normalizedDirectoryPath = directoryPath.split(path.sep).join('/').toLowerCase();
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

            const aDepth = a.relativePath.split(path.sep).length;
            const bDepth = b.relativePath.split(path.sep).length;
            if (aDepth !== bDepth) {
                return aDepth - bDepth;
            }

            return a.title.localeCompare(b.title);
        });

        return resultsWithType.slice(0, maxResults);
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

        // Helper function to check if filePrefix is safe for glob narrowing
        const isSafeForGlob = (str: string): boolean => {
            return str.length > 0 && !/[*?\[\]{}]/.test(str);
        };

        // Narrow glob pattern by filePrefix when safe to reduce I/O
        // Only apply optimization when directoryPath is specified, to allow directory name matching
        const narrowedGlob = (directoryPath && isSafeForGlob(filePrefix))
            ? `**/${filePrefix}*${extension}`
            : `**/*${extension}`;

        if (directoryPath) {
            // Validate and constrain directoryPath to prevent path traversal
            const candidatePath = path.resolve(searchBase, directoryPath);
            const normalizedBase = path.resolve(searchBase);

            // Ensure candidatePath is a descendant of searchBase
            if (!candidatePath.startsWith(normalizedBase + path.sep) && candidatePath !== normalizedBase) {
                // Path traversal attempt detected, return empty results
                return [];
            }

            // Search only in the specified directory
            searchPath = candidatePath;
            globPattern = narrowedGlob;
        } else {
            // Search in all directories (original behavior)
            searchPath = searchBase;
            globPattern = narrowedGlob;
        }

        const pattern = new vscode.RelativePattern(searchPath, globPattern);

        try {
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', maxResults * 2);

            // Convert files to note objects
            const notes = files.map(file => ({
                title: path.basename(file.fsPath, extension),
                uri: file,
                relativePath: path.relative(searchBase, file.fsPath)
            }));

            // Use the static helper method to filter and sort
            return NoteFinder.filterNotesByPrefix(notes, prefix, maxResults);
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