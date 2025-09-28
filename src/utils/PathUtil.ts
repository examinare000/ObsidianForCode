import * as vscode from 'vscode';
import * as path from 'path';

/**
 * パス処理に関するユーティリティ機能を提供します。
 * 主に、異なるオペレーティングシステム間でのパスの互換性を確保し、
 * 安全なファイル名とURIを生成する役割を担います。
 */
export class PathUtil {
    /**
     * 指定されたパス文字列が絶対パスかどうかを判定します。
     * Node.jsの`path.isAbsolute()`を利用して、Windows、Linux、macOSの
     * 各プラットフォームで一貫した動作を保証します。
     *
     * @param pathString - 判定対象のパス文字列。
     * @returns 絶対パスの場合は`true`、それ以外の場合は`false`。
     */
    static isAbsolutePath(pathString: string): boolean {
        return path.isAbsolute(pathString);
    }

    /**
     * ファイル名として使用できない文字をサニタイズし、Windowsの予約名を回避します。
     *
     * - 禁止文字 (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) をハイフンに置換します。
     * - 制御文字（タブ、改行など）をハイフンに置換します。
     * - ファイル名の前後にある空白を削除します。
     * - ファイル名の末尾にあるピリオドを削除します。
     * - Windowsの予約名（CON, PRNなど）と一致する場合、先頭にアンダースコアを追加します。
     * - ファイル名の長さを255バイトに制限します。
     *
     * @param fileName - サニタイズ対象のファイル名。
     * @returns サニタイズされた安全なファイル名。
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
     * ファイルの保存先URIを安全に生成します。
     *
     * `vaultRoot`が絶対パスか相対パスかを`isAbsolutePath`で判定し、
     * それぞれに応じた方法でURIを構築します。
     * - 絶対パスの場合: `vscode.Uri.file()` を使用して直接URIを生成します。
     * - 相対パスの場合: `vscode.Uri.joinPath()` を使用してワークスペースからの相対URIを生成します。
     *
     * @param vaultRoot - 設定で指定された保管庫のルートパス。
     * @param fileName - 作成するファイルの名前。
     * @param extension - ファイルの拡張子。
     * @param workspaceFolder - 現在のワークスペースフォルダ。
     * @returns 生成された`vscode.Uri`オブジェクト。
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