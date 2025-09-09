import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { ConfigurationManager, ObsdConfiguration } from '../../../src/managers/ConfigurationManager';

// VS Code Configuration APIのモック
class MockWorkspaceConfiguration {
    private configData: Record<string, any>;
    
    constructor(configData: Record<string, any> = {}) {
        this.configData = configData;
    }
    
    get<T>(key: string, defaultValue?: T): T {
        const keys = key.split('.');
        let value = this.configData;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue as T;
            }
        }
        
        return value as T;
    }
    
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }
    
    update(key: string, value: any): Thenable<void> {
        const keys = key.split('.');
        let target = this.configData;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!target[k] || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }
        
        target[keys[keys.length - 1]] = value;
        return Promise.resolve() as Thenable<void>;
    }
}

describe('ConfigurationManager', () => {
    let configManager: ConfigurationManager;
    let mockConfig: MockWorkspaceConfiguration;

    beforeEach(() => {
        mockConfig = new MockWorkspaceConfiguration({
            obsd: {
                vaultRoot: '/test/vault',
                noteExtension: '.md',
                slugStrategy: 'passthrough',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# {{title}}\n\n'
            }
        });
        configManager = new ConfigurationManager(mockConfig);
    });

    describe('基本設定取得', () => {
        it('vaultRootの設定値を取得できる', () => {
            const vaultRoot = configManager.getVaultRoot();
            expect(vaultRoot).to.equal('/test/vault');
        });

        it('noteExtensionのデフォルト値を取得できる', () => {
            const mockConfigEmpty = new MockWorkspaceConfiguration();
            const manager = new ConfigurationManager(mockConfigEmpty);
            
            const extension = manager.getNoteExtension();
            expect(extension).to.equal('.md');
        });

        it('カスタムnoteExtension値を取得できる', () => {
            mockConfig.update('obsd.noteExtension', '.txt');
            
            const extension = configManager.getNoteExtension();
            expect(extension).to.equal('.txt');
        });

        it('slugStrategyの設定値を取得できる', () => {
            const strategy = configManager.getSlugStrategy();
            expect(strategy).to.equal('passthrough');
        });

        it('無効なslugStrategyの場合デフォルト値を返す', () => {
            mockConfig.update('obsd.slugStrategy', 'invalid-strategy');
            
            const strategy = configManager.getSlugStrategy();
            expect(strategy).to.equal('passthrough');
        });
    });

    describe('日時フォーマット設定', () => {
        it('dateFormatの設定値を取得できる', () => {
            const format = configManager.getDateFormat();
            expect(format).to.equal('YYYY-MM-DD');
        });

        it('timeFormatの設定値を取得できる', () => {
            const format = configManager.getTimeFormat();
            expect(format).to.equal('HH:mm');
        });

        it('カスタム日付フォーマットを取得できる', () => {
            mockConfig.update('obsd.dateFormat', 'DD/MM/YYYY');
            
            const format = configManager.getDateFormat();
            expect(format).to.equal('DD/MM/YYYY');
        });
    });

    describe('テンプレート機能', () => {
        it('テンプレート設定値を取得できる', () => {
            const template = configManager.getTemplate();
            expect(template).to.equal('# {{title}}\n\n');
        });

        it('空のテンプレートを処理できる', () => {
            mockConfig.update('obsd.template', '');
            
            const template = configManager.getTemplate();
            expect(template).to.equal('');
        });
    });

    describe('設定検証', () => {
        it('有効な設定を正しく検証する', () => {
            const config = {
                vaultRoot: '/valid/path',
                noteExtension: '.md',
                slugStrategy: 'kebab-case' as const,
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# Title\n'
            };
            
            const result = configManager.validateConfiguration(config);
            
            expect(result.isValid).to.be.true;
            expect(result.errors).to.have.length(0);
        });

        it('無効なslugStrategyでエラーを返す', () => {
            const config = {
                slugStrategy: 'invalid-strategy' as any
            };
            
            const result = configManager.validateConfiguration(config);
            
            expect(result.isValid).to.be.false;
            expect(result.errors).to.have.length(1);
            expect(result.errors[0].field).to.equal('slugStrategy');
        });

        it('空のvaultRootで警告を返す', () => {
            const config = {
                vaultRoot: ''
            };
            
            const result = configManager.validateConfiguration(config);
            
            expect(result.warnings).to.have.length(1);
            expect(result.warnings[0].field).to.equal('vaultRoot');
        });

        it('無効な日付フォーマットでエラーを返す', () => {
            const config = {
                dateFormat: 'invalid-format'
            };
            
            const result = configManager.validateConfiguration(config);
            
            expect(result.isValid).to.be.false;
            expect(result.errors).to.have.length(1);
            expect(result.errors[0].field).to.equal('dateFormat');
        });
    });

    describe('全設定取得', () => {
        it('すべての設定を含むオブジェクトを返す', () => {
            const config = configManager.getConfiguration();
            
            expect(config).to.deep.include({
                vaultRoot: '/test/vault',
                noteExtension: '.md',
                slugStrategy: 'passthrough',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: 'HH:mm',
                template: '# {{title}}\n\n'
            });
        });
    });

    describe('設定変更監視', () => {
        it('設定変更コールバックを登録できる', () => {
            let callbackCalled = false;
            let callbackConfig: any;
            
            const disposable = configManager.onConfigurationChanged((config: ObsdConfiguration) => {
                callbackCalled = true;
                callbackConfig = config;
            });
            
            // 設定変更をシミュレート
            mockConfig.update('obsd.vaultRoot', '/new/vault');
            configManager.triggerConfigurationChanged(); // テスト用メソッド
            
            expect(callbackCalled).to.be.true;
            expect(callbackConfig.vaultRoot).to.equal('/new/vault');
            
            disposable.dispose();
        });
    });
});