/**
 * @fileoverview Type definitions for VS Code API testing.
 * Provides mock interfaces for VS Code API types to enable testing
 * in environments where the actual vscode module is not available.
 *
 * @author MDloggerForCode Team
 * @version 1.0.0
 */

/**
 * Type definitions for VS Code API testing.
 * Supports test execution in environments where the actual vscode module is unavailable.
 */

/**
 * Represents a position in a text document.
 * Contains line and character coordinates for cursor positioning and text manipulation.
 */
export interface Position {
    line: number;
    character: number;
}

/**
 * Represents a range in a text document.
 * Defined by start and end positions to specify text selections or regions.
 */
export interface Range {
    start: Position;
    end: Position;
}

/**
 * Represents a universal resource identifier (URI).
 * Provides different representations of file paths for cross-platform compatibility.
 */
export interface Uri {
    path: string;
    fsPath: string;
    toString(): string;
}

/**
 * Represents a text document in the editor.
 * Provides access to document content, metadata, and position conversion utilities.
 */
export interface TextDocument {
    uri: Uri;
    languageId: string;
    getText(): string;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
}

/**
 * Represents a clickable link within a document.
 * Contains the text range and optional target URI for navigation.
 */
export interface DocumentLink {
    range: Range;
    target?: Uri;
}

/**
 * Provider interface for document links.
 * Scans documents and returns clickable links for navigation.
 */
export interface DocumentLinkProvider {
    provideDocumentLinks(document: TextDocument): DocumentLink[] | Promise<DocumentLink[]>;
}

/**
 * Represents an active text editor in VS Code.
 * Provides access to the document and current selection state.
 */
export interface TextEditor {
    document: TextDocument;
    selection: { active: Position; start: Position; end: Position };
}

/**
 * Represents a text selection in an editor.
 * Contains the active cursor position and selection boundaries.
 */
export interface Selection {
    active: Position;
    start: Position;
    end: Position;
}
