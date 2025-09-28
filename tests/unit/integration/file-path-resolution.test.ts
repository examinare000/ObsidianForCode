import { describe, it } from 'mocha';
// expect はテストsetup.tsからグローバルにインポート済み
const expect = (global as any).expect;

describe('ファイルパス解決テスト', () => {
    describe('ワークスペース相対パス解決', () => {
        it('vaultRootが空の場合、ワークスペースルートに作成される', () => {
            const workspacePath = '/Users/user/project';
            const vaultRoot = '';
            const fileName = 'Simple Page';
            const extension = '.md';

            const expectedPath = `${workspacePath}/Simple Page.md`;
            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);

            expect(actualPath).to.equal(expectedPath);
        });

        it('vaultRootが相対パスの場合、ワークスペースからの相対パスになる', () => {
            const workspacePath = '/Users/user/project';
            const vaultRoot = 'notes';
            const fileName = 'Simple Page';
            const extension = '.md';

            const expectedPath = `${workspacePath}/notes/Simple Page.md`;
            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);

            expect(actualPath).to.equal(expectedPath);
        });

        it('vaultRootが絶対パスの場合、そのパスを使用する', () => {
            const workspacePath = '/Users/user/project';
            const vaultRoot = '/Users/user/vault';
            const fileName = 'Simple Page';
            const extension = '.md';

            const expectedPath = '/Users/user/vault/Simple Page.md';
            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);

            expect(actualPath).to.equal(expectedPath);
        });

        it('ファイル名の特殊文字が正規化される', () => {
            const workspacePath = '/Users/user/project';
            const vaultRoot = '';
            const fileName = 'File/with:special*chars?';
            const extension = '.md';

            const expectedPath = `${workspacePath}/File-with-special-chars-.md`;
            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);

            expect(actualPath).to.equal(expectedPath);
        });

        it('空文字やnullの場合の処理', () => {
            const workspacePath = '/Users/user/project';
            const vaultRoot = null;
            const fileName = '';
            const extension = '.md';

            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);
            // 空のファイル名は無効なので、デフォルト値またはエラー処理
            expect(actualPath).to.equal(''); // エラーケースとして空文字を返す
        });
    });

    describe('実際のエラーケース', () => {
        it('ルートディレクトリ（/）への作成を防ぐ', () => {
            const workspacePath = '/Users/user/project';
            const vaultRoot = ''; // 空の場合、ワークスペースルートを使用
            const fileName = 'Simple Page';
            const extension = '.md';

            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);

            // ルートディレクトリ（/Simple Page.md）を避ける
            expect(actualPath).to.not.equal('/Simple Page.md');
            expect(actualPath).to.equal('/Users/user/project/Simple Page.md');
        });

        it('現在のエラーケース: ConfigurationManagerでvaultRootが空の場合', () => {
            // ユーザーが設定していない場合のデフォルト動作
            const workspacePath = '/Users/rio/git/ObsidianForCode';
            const vaultRoot = ''; // 設定が空
            const fileName = 'Simple Page';
            const extension = '.md';

            const actualPath = resolveFilePath(workspacePath, vaultRoot, fileName, extension);

            // 期待値：ワークスペース内のファイル
            expect(actualPath).to.equal('/Users/rio/git/ObsidianForCode/Simple Page.md');
            // 絶対にルートディレクトリではない
            expect(actualPath).to.not.equal('/Simple Page.md');
        });
    });
});

// ファイルパス解決のヘルパー関数
function resolveFilePath(workspacePath: string, vaultRoot: string | null | undefined, fileName: string, extension: string): string {
    // ファイル名が空の場合はエラー
    if (!fileName || fileName.trim() === '') {
        return '';
    }

    // ファイル名を正規化
    const sanitizedFileName = sanitizeFileName(fileName);

    // vaultRootの処理
    const cleanVaultRoot = vaultRoot?.trim() || '';

    if (cleanVaultRoot === '') {
        // vaultRootが空の場合、ワークスペースルートに作成
        return `${workspacePath}/${sanitizedFileName}${extension}`;
    } else if (cleanVaultRoot.startsWith('/') || cleanVaultRoot.match(/^[A-Za-z]:/)) {
        // 絶対パス
        return `${cleanVaultRoot}/${sanitizedFileName}${extension}`;
    } else {
        // 相対パス（ワークスペースからの相対）
        return `${workspacePath}/${cleanVaultRoot}/${sanitizedFileName}${extension}`;
    }
}

// ファイル名正規化（extension.tsから移植）
function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[/\\:*?"<>|]/g, '-')  // 特殊文字をハイフンに変換
        .replace(/\s+/g, ' ')          // 複数の空白を単一の空白に
        .trim()                        // 前後の空白を削除
        .substring(0, 255);            // ファイル名長制限
}