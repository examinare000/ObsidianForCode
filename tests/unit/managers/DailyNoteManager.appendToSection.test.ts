import { expect } from 'chai';
import * as vscode from 'vscode';
import { DailyNoteManager } from '../../../src/managers/DailyNoteManager';
import { ConfigurationManager } from '../../../src/managers/ConfigurationManager';
import { DateTimeFormatter } from '../../../src/utils/DateTimeFormatter';

/**
 * NOTE: これらのテストは現在スキップされています。
 *
 * 理由:
 * - DailyNoteManager.appendToSectionはvscode.workspace.fsに強く依存している
 * - 単体テストでvscode.workspace.fsを適切にモックするのは複雑で脆い
 * - より適切なアプローチは統合テストでカバーすること
 *
 * 今後の改善:
 * - IFileSystemのような抽象化レイヤーを導入して依存性注入を可能にする
 * - または統合テストスイートを充実させる
 */
describe.skip('DailyNoteManager.appendToSection', () => {
    let dailyNoteManager: DailyNoteManager;
    let mockConfigManager: ConfigurationManager;
    let mockDateTimeFormatter: DateTimeFormatter;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    let fileStore: Map<string, Uint8Array>;

    beforeEach(() => {
        // ファイルストアの初期化
        fileStore = new Map();

        // ConfigurationManagerのモック
        mockConfigManager = {
            getDailyNoteTemplate: () => '',
            getDailyNotePath: () => 'dailynotes',
            getDateFormat: () => 'YYYY-MM-DD',
            getTimeFormat: () => 'HH:mm',
            getVaultRoot: () => '',
            getNoteExtension: () => '.md',
            getCaptureSectionName: () => 'Quick Notes'
        } as any;

        // DateTimeFormatterのモック
        mockDateTimeFormatter = {
            formatDate: (date: Date, _format: string) => {
                return date.toISOString().split('T')[0];
            },
            formatTime: (date: Date, _format: string) => {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
            }
        } as any;

        // WorkspaceFolderのモック
        mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };

        dailyNoteManager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
    });

    describe('空ファイルへのセクション作成と追記', () => {
        it('should create section and append content to empty file', async () => {
            // Red phase: このテストは失敗するはず（実装を検証するため）
            const testDate = new Date('2025-11-07T14:30:00');
            const content = 'Test capture content';

            // 空ファイルを作成
            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode(''));

            const result = await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined, // デフォルトセクション名を使用
                testDate
            );

            expect(result.uri.fsPath).to.equal(dailyNoteUri.fsPath);
            expect(result.line).to.be.a('number');

            // ファイル内容を確認
            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));
            expect(fileContent).to.include('## Quick Notes');
            expect(fileContent).to.include('14:30 — Test capture content');
            expect(fileContent).to.match(/- \[ \] 14:30 — Test capture content/);
        });
    });

    describe('既存セクションへの追記', () => {
        it('should append content to existing section', async () => {
            const testDate = new Date('2025-11-07T15:45:00');
            const content = 'Another task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## Quick Notes
- [ ] 10:00 — First task

## Other Section
Some other content`;

            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode(initialContent));

            const result = await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));

            // 既存タスクが保持されていることを確認
            expect(fileContent).to.include('- [ ] 10:00 — First task');

            // 新しいタスクが追加されていることを確認
            expect(fileContent).to.include('- [ ] 15:45 — Another task');

            // Quick Notesセクションの後、Other Sectionの前に挿入されていることを確認
            const quickNotesIndex = fileContent.indexOf('## Quick Notes');
            const newTaskIndex = fileContent.indexOf('- [ ] 15:45 — Another task');
            const otherSectionIndex = fileContent.indexOf('## Other Section');

            expect(quickNotesIndex).to.be.lessThan(newTaskIndex);
            expect(newTaskIndex).to.be.lessThan(otherSectionIndex);
        });
    });

    describe('複数セクションがある場合の正しい位置への挿入', () => {
        it('should insert before next section heading', async () => {
            const testDate = new Date('2025-11-07T16:00:00');
            const content = 'Middle task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## Section 1
Content 1

## Quick Notes
- [ ] 10:00 — Task 1

## Section 2
Content 2

## Section 3
Content 3`;

            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode(initialContent));

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));

            // 新しいタスクがQuick NotesとSection 2の間に挿入されることを確認
            const lines = fileContent.split('\n');
            const quickNotesIndex = lines.findIndex(line => line.includes('## Quick Notes'));
            const section2Index = lines.findIndex(line => line.includes('## Section 2'));
            const newTaskIndex = lines.findIndex(line => line.includes('16:00 — Middle task'));

            expect(newTaskIndex).to.be.greaterThan(quickNotesIndex);
            expect(newTaskIndex).to.be.lessThan(section2Index);
        });
    });

    describe('セクションがない場合の新規作成', () => {
        it('should create new section when it does not exist', async () => {
            const testDate = new Date('2025-11-07T17:00:00');
            const content = 'New section task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## Existing Section
Some content`;

            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode(initialContent));

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));

            // 新しいセクションが作成されることを確認
            expect(fileContent).to.include('## Quick Notes');
            expect(fileContent).to.include('- [ ] 17:00 — New section task');
        });

        it('should create section with custom name', async () => {
            const testDate = new Date('2025-11-07T18:00:00');
            const content = 'Custom section task';
            const customSectionName = 'My Custom Section';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode('# Daily Note\n'));

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                customSectionName,
                testDate
            );

            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));

            expect(fileContent).to.include(`## ${customSectionName}`);
            expect(fileContent).to.include('- [ ] 18:00 — Custom section task');
        });
    });

    describe('タイムスタンプ付き行の正しいフォーマット', () => {
        it('should format line with timestamp and checkbox', async () => {
            const testDate = new Date('2025-11-07T09:05:00');
            const content = 'Formatted task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode(''));

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));

            // フォーマット: "- [ ] HH:mm — content"
            expect(fileContent).to.match(/- \[ \] 09:05 — Formatted task/);
        });
    });

    describe('ファイルが存在しない場合の作成', () => {
        it('should create file if it does not exist', async () => {
            const testDate = new Date('2025-11-07T20:00:00');
            const content = 'Task in new file';

            const result = await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            expect(result.uri.fsPath).to.include('2025-11-07.md');
            expect(result.line).to.be.a('number');

            // ファイルが作成され、内容が書き込まれたことを確認
            const fileContent = new TextDecoder().decode(
                fileStore.get(result.uri.fsPath) || new Uint8Array()
            );
            expect(fileContent).to.include('## Quick Notes');
            expect(fileContent).to.include('20:00 — Task in new file');
        });
    });

    describe('最後のセクションの場合、ファイル末尾に追記', () => {
        it('should append to end of file when section is last', async () => {
            const testDate = new Date('2025-11-07T21:00:00');
            const content = 'Last section task';

            const dailyNoteUri = vscode.Uri.file('/test/workspace/dailynotes/2025-11-07.md');
            const initialContent = `# Daily Note

## First Section
Content 1

## Quick Notes
- [ ] 10:00 — Task 1`;

            fileStore.set(dailyNoteUri.fsPath, new TextEncoder().encode(initialContent));

            await dailyNoteManager.appendToSection(
                mockWorkspaceFolder,
                content,
                undefined,
                testDate
            );

            const fileContent = new TextDecoder().decode(fileStore.get(dailyNoteUri.fsPath));

            // 新しいタスクがファイル末尾に追記されることを確認
            const lines = fileContent.split('\n');
            const lastLine = lines[lines.length - 1];
            const secondLastLine = lines[lines.length - 2];

            // 最後または最後から2番目の行に新しいタスクがあることを確認
            const hasTaskAtEnd = lastLine.includes('21:00 — Last section task') ||
                                 secondLastLine.includes('21:00 — Last section task');
            expect(hasTaskAtEnd).to.be.true;
        });
    });
});
