import * as vscode from 'vscode';

export interface IFileWriter {
    read(uri: vscode.Uri): Promise<string>;
    write(uri: vscode.Uri, content: string): Promise<void>;
}

/**
 * A thin wrapper around VS Code's workspace.fs to perform file reads/writes.
 * Kept minimal so tests can mock IFileWriter.
 */
export class VscodeFileWriter implements IFileWriter {
    async read(uri: vscode.Uri): Promise<string> {
        const bytes = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(bytes).toString('utf8');
    }

    async write(uri: vscode.Uri, content: string): Promise<void> {
        const bytes = Buffer.from(content, 'utf8');
        await vscode.workspace.fs.writeFile(uri, bytes);
    }
}

export default IFileWriter;
