import * as vscode from 'vscode';
import * as path from 'path';
import { IFileWriter } from './FileWriter';
import { collectOpenTasksFromFiles, applyTaskCompletionToContent, CollectedTask } from '../utils/TaskCollector';

/**
 * TaskService orchestrates reading files, collecting open tasks and applying completions.
 * It is intentionally small and uses an injected IFileWriter so it can be unit tested.
 */
export class TaskService {
    private fileWriter: IFileWriter;

    constructor(fileWriter: IFileWriter) {
        this.fileWriter = fileWriter;
    }

    /**
     * Collect open tasks from the provided URIs.
     * Reads each file via the fileWriter and returns collected tasks.
     */
    async collectTasksFromUris(uris: vscode.Uri[]): Promise<CollectedTask[]> {
        const filesForCollector: { uri: string; file: string; content: string }[] = [];
        for (const uri of uris) {
            const content = await this.fileWriter.read(uri);
            filesForCollector.push({ uri: uri.fsPath, file: path.basename(uri.fsPath), content });
        }

        return collectOpenTasksFromFiles(filesForCollector);
    }

    /**
     * Mark a single task as completed in the given file.
     * Returns the updated content after write.
     */
    async completeTask(uri: vscode.Uri, lineIndex: number, completionDate: string): Promise<string> {
        const content = await this.fileWriter.read(uri);
        const newContent = applyTaskCompletionToContent(content, lineIndex, completionDate);
        await this.fileWriter.write(uri, newContent);
        return newContent;
    }
}

export default TaskService;
