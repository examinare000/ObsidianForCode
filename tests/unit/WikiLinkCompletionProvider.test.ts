/**
 * @fileoverview Unit tests for WikiLinkCompletionProvider.
 * Tests WikiLink autocomplete suggestions functionality.
 *
 * @author ObsidianForCode Team
 * @version 1.0.0
 */

import { expect } from 'chai';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { WikiLinkCompletionProvider } from '../../src/providers/WikiLinkCompletionProvider';
import { ConfigurationManager } from '../../src/managers/ConfigurationManager';
import { NoteFinder } from '../../src/utils/NoteFinder';

/**
 * Helper to create a mock TextDocument with proper offsetAt/positionAt implementation
 */
function createMockDocument(lines: string[], uri: vscode.Uri = vscode.Uri.file('/test/document.md')): vscode.TextDocument {
    // Calculate offset for a given position
    const offsetAt = (position: vscode.Position): number => {
        let offset = 0;
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        offset += Math.min(position.character, lines[position.line]?.length || 0);
        return offset;
    };

    // Calculate position for a given offset
    const positionAt = (offset: number): vscode.Position => {
        let currentOffset = 0;
        for (let line = 0; line < lines.length; line++) {
            const lineLength = lines[line].length;
            if (currentOffset + lineLength >= offset) {
                return new vscode.Position(line, offset - currentOffset);
            }
            currentOffset += lineLength + 1; // +1 for newline
        }
        // If offset is beyond document, return end position
        const lastLine = lines.length - 1;
        return new vscode.Position(lastLine, lines[lastLine]?.length || 0);
    };

    return {
        uri: uri,
        fileName: uri.fsPath,
        isUntitled: false,
        languageId: 'markdown',
        version: 1,
        isDirty: false,
        isClosed: false,
        lineCount: lines.length,
        lineAt: (lineOrPosition: number | vscode.Position) => {
            const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
            const text = lines[lineNum] || '';
            return {
                lineNumber: lineNum,
                text: text,
                range: new vscode.Range(lineNum, 0, lineNum, text.length),
                rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
                firstNonWhitespaceCharacterIndex: text.search(/\S/),
                isEmptyOrWhitespace: text.trim().length === 0
            } as vscode.TextLine;
        },
        getText: () => lines.join('\n'),
        getWordRangeAtPosition: () => undefined,
        validateRange: (range: vscode.Range) => range,
        validatePosition: (position: vscode.Position) => position,
        offsetAt: offsetAt,
        positionAt: positionAt,
        save: async () => true,
        eol: vscode.EndOfLine.LF,
        notebook: undefined
    } as unknown as vscode.TextDocument;
}

describe('WikiLinkCompletionProvider', () => {
    let provider: WikiLinkCompletionProvider;
    let mockConfig: any;
    let findNotesByPrefixStub: sinon.SinonStub;
    let getWorkspaceFolderStub: sinon.SinonStub;

    const mockWorkspaceFolder: vscode.WorkspaceFolder = {
        uri: vscode.Uri.file('/test/workspace'),
        name: 'test-workspace',
        index: 0
    };

    beforeEach(() => {
        mockConfig = {
            get: (key: string, defaultValue?: any) => {
                const configs: any = {
                    'vaultRoot': 'notes',
                    'noteExtension': '.md',
                    'listContinuationEnabled': true
                };
                return configs[key] || defaultValue;
            },
            has: () => true,
            update: async () => {}
        };

        const configManager = new ConfigurationManager(mockConfig);
        provider = new WikiLinkCompletionProvider(configManager);

        // Stub vscode.workspace.getWorkspaceFolder
        getWorkspaceFolderStub = sinon.stub(vscode.workspace, 'getWorkspaceFolder')
            .returns(mockWorkspaceFolder);

        // Stub NoteFinder.findNotesByPrefix
        findNotesByPrefixStub = sinon.stub(NoteFinder, 'findNotesByPrefix');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('provideCompletionItems', () => {
        it('should provide completion items when inside WikiLink brackets', async () => {
            const mockNotes = [
                { title: 'First Note', uri: vscode.Uri.file('/test/First Note.md'), relativePath: 'First Note.md' },
                { title: 'Second Note', uri: vscode.Uri.file('/test/Second Note.md'), relativePath: 'Second Note.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const lines = ['Some text [[Fi'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 13); // After [[Fi
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(2);
            expect(result![0].label).to.equal('First Note');
            expect(result![1].label).to.equal('Second Note');
            expect(result![0].insertText).to.equal('First Note');
        });

        it('should return null when not inside WikiLink brackets', async () => {
            const lines = ['Some regular text'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 10);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.be.null;
        });

        it('should return null when cursor is outside WikiLink brackets (after ]])', async () => {
            const lines = ['Some text [[Note]] more text'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 19); // After ]]
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.be.null;
        });

        it('should filter suggestions based on typed prefix', async () => {
            const mockNotes = [
                { title: 'Project Plan', uri: vscode.Uri.file('/test/Project Plan.md'), relativePath: 'Project Plan.md' },
                { title: 'Project Notes', uri: vscode.Uri.file('/test/Project Notes.md'), relativePath: 'Project Notes.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const lines = ['Reference to [[Proj'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 19); // After [[Proj
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(2);
            // Verify that findNotesByPrefix was called with 'Proj' prefix
            expect(findNotesByPrefixStub.calledOnce).to.be.true;
            expect(findNotesByPrefixStub.firstCall.args[0]).to.equal('Proj');
        });

        it('should sort exact matches first', async () => {
            const mockNotes = [
                { title: 'Test', uri: vscode.Uri.file('/test/Test.md'), relativePath: 'Test.md' },
                { title: 'Testing', uri: vscode.Uri.file('/test/Testing.md'), relativePath: 'Testing.md' },
                { title: 'Test Cases', uri: vscode.Uri.file('/test/Test Cases.md'), relativePath: 'Test Cases.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const lines = ['[[Test'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 6);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(3);
            // Since NoteFinder already sorts, first item should be 'Test' (exact match)
            expect(result![0].label).to.equal('Test');
            // Check sortText ordering
            expect(result![0].sortText).to.equal('000');
            expect(result![1].sortText).to.equal('001');
            expect(result![2].sortText).to.equal('002');
        });

        it('should handle closing brackets correctly when they exist', async () => {
            const mockNotes = [
                { title: 'Note', uri: vscode.Uri.file('/test/Note.md'), relativePath: 'Note.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const lines = ['Text [[Not]]'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 10); // Between [[Not and ]]
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(1);
            // Check that range is set correctly when ]] exists
            expect(result![0].range).to.not.be.undefined;
            const range = result![0].range as vscode.Range;
            expect(range.start.line).to.equal(0);
            expect(range.start.character).to.equal(7); // After [[
            expect(range.end.line).to.equal(0);
            expect(range.end.character).to.equal(10); // Before ]]
        });

        it('should return null when no workspace folder is found', async () => {
            getWorkspaceFolderStub.returns(undefined);

            const lines = ['[[Note'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 6);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.be.null;
        });

        it('should return empty array when no notes match', async () => {
            findNotesByPrefixStub.resolves([]);

            const lines = ['[[NonExistent'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 13);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(0);
        });

        it('should include file details and documentation', async () => {
            const mockNotes = [
                { title: 'Important Note', uri: vscode.Uri.file('/test/subfolder/Important Note.md'), relativePath: 'subfolder/Important Note.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const lines = ['[[Imp'];
            const doc = createMockDocument(lines);
            const position = new vscode.Position(0, 5);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(1);
            expect(result![0].detail).to.equal('subfolder/Important Note.md');
            expect(result![0].documentation).to.be.instanceOf(vscode.MarkdownString);
            const docString = (result![0].documentation as vscode.MarkdownString).value;
            expect(docString).to.include('Important Note');
            expect(docString).to.include('subfolder/Important Note.md');
        });

        it('should search using text before heading separator and preserve heading segment', async () => {
            const mockNotes = [
                { title: 'My Note', uri: vscode.Uri.file('/vault/My Note.md'), relativePath: 'My Note.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const line = '[[My Note#Heading';
            const doc = createMockDocument([line]);
            const position = new vscode.Position(0, line.length);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(result).to.have.lengthOf(1);
            expect(findNotesByPrefixStub.firstCall.args[0]).to.equal('My Note');

            const range = result![0].range as vscode.Range;
            expect(range.start.character).to.equal(2); // after [[
            expect(range.end.character).to.equal(line.indexOf('#'));
        });

        it('should limit replacement to text before alias separator', async () => {
            const mockNotes = [
                { title: 'Project Plan', uri: vscode.Uri.file('/vault/Project Plan.md'), relativePath: 'Project Plan.md' }
            ];
            findNotesByPrefixStub.resolves(mockNotes);

            const line = '[[Project|Display';
            const doc = createMockDocument([line]);
            const position = new vscode.Position(0, line.indexOf('|'));
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.not.be.null;
            expect(findNotesByPrefixStub.firstCall.args[0]).to.equal('Project');

            const range = result![0].range as vscode.Range;
            expect(range.end.character).to.equal(line.indexOf('|'));
        });

        it('should return null when caret is inside alias segment', async () => {
            const line = '[[Project|Display';
            const doc = createMockDocument([line]);
            const position = new vscode.Position(0, line.length);
            const token = new vscode.CancellationTokenSource().token;
            const context: vscode.CompletionContext = { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined };

            const result = await provider.provideCompletionItems(doc, position, token, context);

            expect(result).to.be.null;
            expect(findNotesByPrefixStub.called).to.be.false;
        });
    });

    describe('resolveCompletionItem', () => {
        it('should return the same item (all details provided upfront)', () => {
            const item = new vscode.CompletionItem('Test', vscode.CompletionItemKind.File);
            const token = new vscode.CancellationTokenSource().token;

            const result = provider.resolveCompletionItem!(item, token);

            expect(result).to.equal(item);
        });
    });
});
