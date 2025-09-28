/**
 * テスト用のVS Code API型定義
 * 実際のvscode moduleが利用できない環境でのテスト実行をサポートします
 */

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Uri {
    path: string;
    fsPath: string;
    toString(): string;
}

export interface TextDocument {
    uri: Uri;
    languageId: string;
    getText(): string;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
}

export interface DocumentLink {
    range: Range;
    target?: Uri;
}

export interface DocumentLinkProvider {
    provideDocumentLinks(document: TextDocument): DocumentLink[];
}

export interface TextEditor {
    document: TextDocument;
    selection: { active: Position; start: Position; end: Position };
}

export interface Selection {
    active: Position;
    start: Position;
    end: Position;
}