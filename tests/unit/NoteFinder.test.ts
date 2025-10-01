/**
 * @fileoverview Unit tests for NoteFinder utility.
 * Tests note searching functionality across subdirectories.
 *
 * @author ObsidianForCode Team
 * @version 1.0.0
 */

import { expect } from 'chai';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { NoteFinder } from '../../src/utils/NoteFinder';

describe('NoteFinder', () => {
    let findFilesStub: sinon.SinonStub;

    afterEach(() => {
        sinon.restore();
    });

    describe('findNoteByTitle', () => {
        it('should find note in subdirectory by exact title match', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/subfolder/Meeting Notes.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'Meeting Notes',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.not.be.null;
            expect(result!.title).to.equal('Meeting Notes');
            expect(result!.uri.fsPath).to.include('Meeting Notes.md');
        });

        it('should prioritize root level files over subdirectory files', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/deep/folder/Test.md'),
                vscode.Uri.file('/test/workspace/notes/Test.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNoteByTitle(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.not.be.null;
            // Should return the shallower path (notes/Test.md)
            expect(result!.relativePath).to.equal('Test.md');
        });

        it('should return null when no matching file is found', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves([]);

            const result = await NoteFinder.findNoteByTitle(
                'NonExistent',
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.be.null;
        });
    });

    describe('findNotesByPrefix', () => {
        it('should find all notes with titles starting with prefix', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Project Plan.md'),
                vscode.Uri.file('/test/workspace/notes/Project Notes.md'),
                vscode.Uri.file('/test/workspace/notes/Project Overview.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Project',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title).to.include('Project');
            expect(result[1].title).to.include('Project');
            expect(result[2].title).to.include('Project');
        });

        it('should be case-insensitive when matching prefixes', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Test.md'),
                vscode.Uri.file('/test/workspace/notes/testing.md'),
                vscode.Uri.file('/test/workspace/notes/TEST FILE.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title.toLowerCase()).to.include('test');
            expect(result[1].title.toLowerCase()).to.include('test');
            expect(result[2].title.toLowerCase()).to.include('test');
        });

        it('should sort results by relevance (exact match first, then depth, then alphabetically)', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/deep/folder/Test.md'),
                vscode.Uri.file('/test/workspace/notes/Testing.md'),
                vscode.Uri.file('/test/workspace/notes/Test.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/Test Cases.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                10
            );

            expect(result).to.have.lengthOf(4);
            // First should be exact match at shallowest depth
            expect(result[0].title).to.equal('Test');
            expect(result[0].relativePath).to.equal('Test.md');
        });

        it('should respect maxResults parameter and return top-ranked entries', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Note1.md'),
                vscode.Uri.file('/test/workspace/notes/Note2.md'),
                vscode.Uri.file('/test/workspace/notes/Note3.md'),
                vscode.Uri.file('/test/workspace/notes/Note4.md'),
                vscode.Uri.file('/test/workspace/notes/Note5.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Note',
                mockWorkspaceFolder,
                'notes',
                '.md',
                3 // maxResults = 3
            );

            // Should return only 3 results, even though 5 files match
            expect(result).to.have.lengthOf(3);
        });

        it('should prioritize exact matches even when found later in the list', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Testing Advanced.md'),
                vscode.Uri.file('/test/workspace/notes/Testing Guide.md'),
                vscode.Uri.file('/test/workspace/notes/Testing Overview.md'),
                vscode.Uri.file('/test/workspace/notes/deep/folder/Test.md'), // Exact match, deeper
                vscode.Uri.file('/test/workspace/notes/Testing Tutorial.md'),
                vscode.Uri.file('/test/workspace/notes/Test.md') // Exact match, shallow
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.findNotesByPrefix(
                'Test',
                mockWorkspaceFolder,
                'notes',
                '.md',
                3 // maxResults = 3
            );

            // Should return top 3 after sorting
            expect(result).to.have.lengthOf(3);
            // First should be exact match at shallowest depth
            expect(result[0].title).to.equal('Test');
            expect(result[0].relativePath).to.equal('Test.md');
        });
    });

    describe('getAllNotes', () => {
        it('should return all markdown files in workspace', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/File1.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/File2.md'),
                vscode.Uri.file('/test/workspace/notes/deep/folder/File3.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .resolves(mockFiles);

            const result = await NoteFinder.getAllNotes(
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.have.lengthOf(3);
            expect(result[0].title).to.equal('File1');
            expect(result[1].title).to.equal('File2');
            expect(result[2].title).to.equal('File3');
        });

        it('should exclude node_modules directory', async () => {
            const mockWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            };

            const mockFiles = [
                vscode.Uri.file('/test/workspace/notes/Valid.md'),
                vscode.Uri.file('/test/workspace/notes/subfolder/Also Valid.md')
            ];

            findFilesStub = sinon.stub(vscode.workspace, 'findFiles')
                .callsFake((include: vscode.GlobPattern, exclude?: vscode.GlobPattern | null) => {
                    // Verify that node_modules is excluded
                    expect(exclude).to.not.be.undefined;
                    expect(exclude).to.not.be.null;
                    expect(exclude!.toString()).to.include('node_modules');
                    return Promise.resolve(mockFiles);
                });

            const result = await NoteFinder.getAllNotes(
                mockWorkspaceFolder,
                'notes',
                '.md'
            );

            expect(result).to.have.lengthOf(2);
            expect(findFilesStub.calledOnce).to.be.true;
        });
    });
});
