import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('obsidianforcode.obsidianforcode'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('obsidianforcode.obsidianforcode');
        assert.ok(ext);
        await ext?.activate();
        assert.ok(ext?.isActive);
    });
});