import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as path from 'path';

// VS Code依存を排除したテスト実装
describe('PathUtil (Windows File Path Handling)', () => {
    // テスト用PathUtilクラス（VS Code依存なし）
    class TestPathUtil {
        /**
         * プラットフォーム対応の絶対パス判定
         */
        static isAbsolutePath(pathString: string): boolean {
            // Unix/Linux/macOS
            if (pathString.startsWith('/')) return true;
            // Windows ドライブレター
            if (pathString.match(/^[A-Za-z]:[/\\]/)) return true;
            // Windows UNC パス
            if (pathString.match(/^\\\\[^\\]+\\/)) return true;
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
         * 安全なパス作成（テスト用簡易版）
         */
        static createSafePath(
            vaultRoot: string,
            fileName: string,
            extension: string,
            workspaceRoot: string
        ): string {
            const sanitizedFileName = this.sanitizeFileName(fileName) + extension;

            if (vaultRoot && vaultRoot.trim() !== '') {
                if (this.isAbsolutePath(vaultRoot)) {
                    // 絶対パス: path.resolve()でクロスプラットフォーム対応
                    return path.resolve(vaultRoot, sanitizedFileName);
                } else {
                    // 相対パス: workspaceからの相対パス
                    return path.resolve(workspaceRoot, vaultRoot, sanitizedFileName);
                }
            } else {
                // vaultRootが空の場合、ワークスペースルートに作成
                return path.resolve(workspaceRoot, sanitizedFileName);
            }
        }
    }

    describe('isAbsolutePath', () => {
        it('should detect Unix absolute paths', () => {
            expect(TestPathUtil.isAbsolutePath('/usr/local/bin')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('/home/user')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('/')).to.equal(true);
        });

        it('should detect Windows drive letter paths', () => {
            expect(TestPathUtil.isAbsolutePath('C:\\Users\\test')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('D:/data')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('Z:\\network')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('c:\\windows')).to.equal(true);
        });

        it('should detect Windows UNC paths', () => {
            expect(TestPathUtil.isAbsolutePath('\\\\server\\share')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('\\\\192.168.1.1\\data')).to.equal(true);
            expect(TestPathUtil.isAbsolutePath('\\\\company-server\\documents')).to.equal(true);
        });

        it('should reject relative paths', () => {
            expect(TestPathUtil.isAbsolutePath('relative/path')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('./current')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('../parent')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('folder\\subfolder')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('')).to.equal(false);
        });

        it('should reject invalid paths', () => {
            expect(TestPathUtil.isAbsolutePath('C')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('C:')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('\\\\')).to.equal(false);
            expect(TestPathUtil.isAbsolutePath('\\\\server')).to.equal(false);
        });
    });

    describe('sanitizeFileName', () => {
        it('should replace special characters', () => {
            expect(TestPathUtil.sanitizeFileName('file:name*')).to.equal('file-name-');
            expect(TestPathUtil.sanitizeFileName('test<file>')).to.equal('test-file-');
            expect(TestPathUtil.sanitizeFileName('path/with\\slash')).to.equal('path-with-slash');
            expect(TestPathUtil.sanitizeFileName('file|pipe')).to.equal('file-pipe');
        });

        it('should handle Windows reserved names', () => {
            expect(TestPathUtil.sanitizeFileName('CON')).to.equal('_CON');
            expect(TestPathUtil.sanitizeFileName('PRN')).to.equal('_PRN');
            expect(TestPathUtil.sanitizeFileName('AUX')).to.equal('_AUX');
            expect(TestPathUtil.sanitizeFileName('NUL')).to.equal('_NUL');
            expect(TestPathUtil.sanitizeFileName('COM1')).to.equal('_COM1');
            expect(TestPathUtil.sanitizeFileName('LPT9')).to.equal('_LPT9');
        });

        it('should handle Windows reserved names case-insensitive', () => {
            expect(TestPathUtil.sanitizeFileName('con')).to.equal('_con');
            expect(TestPathUtil.sanitizeFileName('Prn')).to.equal('_Prn');
            expect(TestPathUtil.sanitizeFileName('aux')).to.equal('_aux');
        });

        it('should remove trailing periods', () => {
            expect(TestPathUtil.sanitizeFileName('file...')).to.equal('file');
            expect(TestPathUtil.sanitizeFileName('document.')).to.equal('document');
            expect(TestPathUtil.sanitizeFileName('test.....')).to.equal('test');
        });

        it('should normalize whitespace', () => {
            expect(TestPathUtil.sanitizeFileName('  file  name  ')).to.equal('file name');
            expect(TestPathUtil.sanitizeFileName('multiple   spaces')).to.equal('multiple spaces');
            expect(TestPathUtil.sanitizeFileName('\t\n\r')).to.equal('untitled'); // タブ・改行のみは空文字列になるためuntitled
        });

        it('should handle length limits', () => {
            const longName = 'a'.repeat(300);
            const result = TestPathUtil.sanitizeFileName(longName);
            expect(result.length).to.equal(255);
            expect(result).to.equal('a'.repeat(255));
        });

        it('should provide fallback for empty strings', () => {
            expect(TestPathUtil.sanitizeFileName('')).to.equal('untitled');
            expect(TestPathUtil.sanitizeFileName('   ')).to.equal('untitled');
            expect(TestPathUtil.sanitizeFileName('...')).to.equal('untitled');
        });

        it('should handle mixed problematic cases', () => {
            expect(TestPathUtil.sanitizeFileName('CON.txt')).to.equal('_CON.txt');
            expect(TestPathUtil.sanitizeFileName('file:*?<>|/\\\\')).to.equal('file---------'); // 9個の特殊文字
            expect(TestPathUtil.sanitizeFileName('  PRN  ...')).to.equal('_PRN');
        });
    });

    describe('createSafePath', () => {
        const workspaceRoot = '/workspace';

        it('should handle absolute vault root', () => {
            const result = TestPathUtil.createSafePath(
                '/absolute/vault',
                'test file',
                '.md',
                workspaceRoot
            );
            expect(result).to.equal(path.resolve('/absolute/vault', 'test file.md'));
        });

        it('should handle relative vault root', () => {
            const result = TestPathUtil.createSafePath(
                'notes',
                'test file',
                '.md',
                workspaceRoot
            );
            expect(result).to.equal(path.resolve(workspaceRoot, 'notes', 'test file.md'));
        });

        it('should handle empty vault root', () => {
            const result = TestPathUtil.createSafePath(
                '',
                'test file',
                '.md',
                workspaceRoot
            );
            expect(result).to.equal(path.resolve(workspaceRoot, 'test file.md'));
        });

        it('should sanitize file names in path creation', () => {
            const result = TestPathUtil.createSafePath(
                'notes',
                'CON:file*',
                '.md',
                workspaceRoot
            );
            expect(result).to.equal(path.resolve(workspaceRoot, 'notes', '_CON-file-.md'));
        });

        it('should handle Windows absolute paths', () => {
            const result = TestPathUtil.createSafePath(
                'C:\\vault',
                'test',
                '.md',
                'C:\\workspace'
            );
            expect(result).to.equal(path.resolve('C:\\vault', 'test.md'));
        });

        it('should handle UNC paths', () => {
            const result = TestPathUtil.createSafePath(
                '\\\\server\\share\\vault',
                'test',
                '.md',
                'C:\\workspace'
            );
            expect(result).to.equal(path.resolve('\\\\server\\share\\vault', 'test.md'));
        });
    });

    describe('Integration scenarios', () => {
        it('should handle typical WikiLink file creation scenario', () => {
            const fileName = 'My Important Note';
            const sanitized = TestPathUtil.sanitizeFileName(fileName);
            const fullPath = TestPathUtil.createSafePath(
                'notes',
                sanitized,
                '.md',
                '/workspace'
            );

            expect(sanitized).to.equal('My Important Note');
            expect(fullPath).to.equal(path.resolve('/workspace', 'notes', 'My Important Note.md'));
        });

        it('should handle problematic WikiLink names', () => {
            const fileName = 'CON: Invalid*Name<>';
            const sanitized = TestPathUtil.sanitizeFileName(fileName);
            const fullPath = TestPathUtil.createSafePath(
                'notes',
                sanitized,
                '.md',
                '/workspace'
            );

            expect(sanitized).to.equal('_CON- Invalid-Name--');
            expect(fullPath).to.equal(path.resolve('/workspace', 'notes', '_CON- Invalid-Name--.md'));
        });

        it('should handle Windows network drive scenario', () => {
            const fileName = 'Network File';
            const sanitized = TestPathUtil.sanitizeFileName(fileName);
            const fullPath = TestPathUtil.createSafePath(
                '\\\\server\\documents',
                sanitized,
                '.md',
                'C:\\local'
            );

            expect(sanitized).to.equal('Network File');
            expect(fullPath).to.equal(path.resolve('\\\\server\\documents', 'Network File.md'));
        });

        it('should handle edge case: empty everything', () => {
            const fileName = '';
            const sanitized = TestPathUtil.sanitizeFileName(fileName);
            const fullPath = TestPathUtil.createSafePath(
                '',
                sanitized,
                '.md',
                '/workspace'
            );

            expect(sanitized).to.equal('untitled');
            expect(fullPath).to.equal(path.resolve('/workspace', 'untitled.md'));
        });
    });
});