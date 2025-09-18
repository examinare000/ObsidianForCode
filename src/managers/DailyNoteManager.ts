import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigurationManager } from './ConfigurationManager';
import { DateTimeFormatter } from '../utils/DateTimeFormatter';

export class DailyNoteManager {
    constructor(
        private configManager: ConfigurationManager,
        private dateTimeFormatter: DateTimeFormatter
    ) {}

    /**
     * 指定日付のDailyNoteファイル名を生成
     */
    getDailyNoteFileName(date: Date): string {
        const dateFormat = this.configManager.getDateFormat();
        const formattedDate = this.dateTimeFormatter.formatDate(date, dateFormat);
        const extension = this.configManager.getNoteExtension();
        return `${formattedDate}${extension}`;
    }

    /**
     * DailyNoteファイルの完全パスを解決
     */
    getDailyNotePath(workspaceFolder: vscode.WorkspaceFolder, date: Date): vscode.Uri {
        const fileName = this.getDailyNoteFileName(date);
        const dailyNotePath = this.configManager.getDailyNotePath();
        const vaultRoot = this.configManager.getVaultRoot();

        if (vaultRoot && vaultRoot.trim() !== '') {
            if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                return vscode.Uri.file(`${vaultRoot}/${dailyNotePath}/${fileName}`);
            } else {
                return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, dailyNotePath, fileName);
            }
        } else {
            return vscode.Uri.joinPath(workspaceFolder.uri, dailyNotePath, fileName);
        }
    }

    /**
     * テンプレートファイルの内容を読み込み
     */
    async getTemplateContent(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const templatePath = this.configManager.getDailyNoteTemplate();

        if (!templatePath || templatePath.trim() === '') {
            return '';
        }

        try {
            const vaultRoot = this.configManager.getVaultRoot();
            let templateUri: vscode.Uri;

            if (vaultRoot && vaultRoot.trim() !== '') {
                if (vaultRoot.startsWith('/') || vaultRoot.match(/^[A-Za-z]:/)) {
                    templateUri = vscode.Uri.file(`${vaultRoot}/${templatePath}`);
                } else {
                    templateUri = vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, templatePath);
                }
            } else {
                templateUri = vscode.Uri.joinPath(workspaceFolder.uri, templatePath);
            }

            const data = await vscode.workspace.fs.readFile(templateUri);
            return new TextDecoder().decode(data);
        } catch (error) {
            // テンプレートファイルが見つからない場合は空文字列を返す
            return '';
        }
    }

    /**
     * DailyNoteを開設または作成するメイン処理
     */
    async openOrCreateDailyNote(workspaceFolder: vscode.WorkspaceFolder, date: Date = new Date()): Promise<void> {
        const dailyNoteUri = this.getDailyNotePath(workspaceFolder, date);

        try {
            // ファイルが既に存在するかチェック
            await vscode.workspace.fs.stat(dailyNoteUri);
            // 存在する場合はそのまま開く
            await vscode.window.showTextDocument(dailyNoteUri);
        } catch {
            // ファイルが存在しない場合は新規作成
            const templateContent = await this.getTemplateContent(workspaceFolder);
            const data = new TextEncoder().encode(templateContent);

            // ディレクトリが存在しない場合は作成
            const dirUri = vscode.Uri.file(path.dirname(dailyNoteUri.fsPath));
            await vscode.workspace.fs.createDirectory(dirUri);

            // ファイル作成
            await vscode.workspace.fs.writeFile(dailyNoteUri, data);

            // 新しいタブで開く
            await vscode.window.showTextDocument(dailyNoteUri);
        }
    }
}