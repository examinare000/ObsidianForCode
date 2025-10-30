import { TaskItem, extractTasks, markTaskCompleted } from './NoteParser';

export interface CollectedTask {
    uri: string;
    file: string;
    line: number;
    text: string;
}

/**
 * Collect open (unchecked) tasks from multiple file contents.
 * files: array of { uri, file, content }
 */
export function collectOpenTasksFromFiles(files: { uri: string; file: string; content: string }[]): CollectedTask[] {
    const results: CollectedTask[] = [];

    for (const f of files) {
        const tasks = extractTasks(f.content);
        for (const t of tasks) {
            results.push({ uri: f.uri, file: f.file, line: t.line, text: t.text });
        }
    }

    return results;
}

/**
 * Apply task completion to the given file content at lineIndex and return the new content.
 * This is a pure wrapper around NoteParser.markTaskCompleted to keep semantics clear.
 */
export function applyTaskCompletionToContent(content: string, lineIndex: number, completionDate: string): string {
    return markTaskCompleted(content, lineIndex, completionDate);
}
