import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Windows環境対応のパス処理ユーティリティ
 */
export class PathUtil {
    /**
     * プラットフォーム対応の絶対パス判定
     */
    static isAbsolutePath(pathString: string): boolean {
        // Unix/Linux/macOS
        if (pathString.startsWith('/')) {
            return true;
        }
        // Windows ドライブレター
        if (pathString.match(/^[A-Za-z]:[/\\]/)) {
            return true;
        }
        // Windows UNC パス
        if (pathString.match(/^\\\\[^\\]+\\/)) {
            return true;
        }
        return false;
    }

    /**
     * Windows予約名対応のファイル名サニタイズ
     */
    static sanitizeFileName(fileName: string): string {
        // Windows予約名チェック
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

        let sanitized = fileName
            .replace(/[/\\:*?"<>|]/g, '-')  // 特殊文字をハイフンに変換
            .replace(/\s+/g, ' ')          // 複数の空白を単一の空白に
            .replace(/[\t\n\r]/g, '-')     // タブ・改行をハイフンに変換
            .trim()                        // 前後の空白を削除
            .replace(/\.+$/, '')           // 末尾のピリオドを削除
            .substring(0, 255);            // ファイル名長制限

        // 空文字列チェック（末尾ピリオド削除後）
        if (!sanitized || sanitized.trim() === '') {
            return 'untitled';
        }

        // 予約名チェック（拡張子を除いたベース名のみ）
        const baseName = sanitized.split('.')[0].trim();
        if (reservedNames.includes(baseName.toUpperCase())) {
            sanitized = `_${sanitized.trim()}`;
        }

        return sanitized.trim();
    }

    /**
     * 安全なURI作成
     */
    static createSafeUri(
        vaultRoot: string,
        fileName: string,
        extension: string,
        workspaceFolder: vscode.WorkspaceFolder
    ): vscode.Uri {
        const sanitizedFileName = this.sanitizeFileName(fileName) + extension;

        if (vaultRoot && vaultRoot.trim() !== '') {
            if (this.isAbsolutePath(vaultRoot)) {
                // 絶対パス: path.resolve()でクロスプラットフォーム対応
                const absolutePath = path.resolve(vaultRoot, sanitizedFileName);
                return vscode.Uri.file(absolutePath);
            } else {
                // 相対パス: joinPathでワークスペースからの相対パス
                return vscode.Uri.joinPath(workspaceFolder.uri, vaultRoot, sanitizedFileName);
            }
        } else {
            // vaultRootが空の場合、ワークスペースルートに作成
            return vscode.Uri.joinPath(workspaceFolder.uri, sanitizedFileName);
        }
    }
}