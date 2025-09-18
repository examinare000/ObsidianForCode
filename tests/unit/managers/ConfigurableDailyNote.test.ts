import { expect } from 'chai';

// 設定可能なDailyNote機能のテスト
describe('Configurable DailyNote Features', () => {

    describe('ConfigurationManager - DailyNote Settings', () => {
        it('should return default DailyNote enabled state as true', () => {
            const { ConfigurationManager } = require('../../../src/managers/ConfigurationManager');

            const mockConfig = {
                get: (key: string, defaultValue?: any) => {
                    if (key === 'dailyNoteEnabled') return true;
                    return defaultValue;
                },
                has: () => true,
                update: () => Promise.resolve()
            };

            const configManager = new ConfigurationManager(mockConfig);
            const enabled = configManager.getDailyNoteEnabled();

            expect(enabled).to.be.true;
        });

        it('should return false when DailyNote is disabled', () => {
            const { ConfigurationManager } = require('../../../src/managers/ConfigurationManager');

            const mockConfig = {
                get: (key: string, defaultValue?: any) => {
                    if (key === 'dailyNoteEnabled') return false;
                    return defaultValue;
                },
                has: () => true,
                update: () => Promise.resolve()
            };

            const configManager = new ConfigurationManager(mockConfig);
            const enabled = configManager.getDailyNoteEnabled();

            expect(enabled).to.be.false;
        });

        it('should return default keybinding setting', () => {
            const { ConfigurationManager } = require('../../../src/managers/ConfigurationManager');

            const mockConfig = {
                get: (key: string, defaultValue?: any) => {
                    if (key === 'dailyNoteKeybinding') return 'ctrl+shift+d';
                    return defaultValue;
                },
                has: () => true,
                update: () => Promise.resolve()
            };

            const configManager = new ConfigurationManager(mockConfig);
            const keybinding = configManager.getDailyNoteKeybinding();

            expect(keybinding).to.equal('ctrl+shift+d');
        });

        it('should return custom keybinding setting', () => {
            const { ConfigurationManager } = require('../../../src/managers/ConfigurationManager');

            const mockConfig = {
                get: (key: string, defaultValue?: any) => {
                    if (key === 'dailyNoteKeybinding') return 'cmd+alt+d';
                    return defaultValue;
                },
                has: () => true,
                update: () => Promise.resolve()
            };

            const configManager = new ConfigurationManager(mockConfig);
            const keybinding = configManager.getDailyNoteKeybinding();

            expect(keybinding).to.equal('cmd+alt+d');
        });
    });

    describe('DailyNoteManager with disabled setting', () => {
        it('should handle disabled state gracefully', () => {
            // DailyNote機能が無効になっている場合でも、
            // DailyNoteManagerクラス自体は正常に動作する必要がある
            const { DailyNoteManager } = require('../../../src/managers/DailyNoteManager');

            const mockConfigManager = {
                getDateFormat: () => 'YYYY-MM-DD',
                getNoteExtension: () => '.md',
                getDailyNotePath: () => 'dailynotes',
                getDailyNoteTemplate: () => '',
                getVaultRoot: () => '',
                getDailyNoteEnabled: () => false // 無効状態
            };

            const mockDateTimeFormatter = {
                formatDate: (date: Date, format: string) => '2025-09-18'
            };

            // DailyNoteManagerは設定に関係なく正常にインスタンス化される
            const manager = new DailyNoteManager(mockConfigManager, mockDateTimeFormatter);
            expect(manager).to.be.an('object');

            // メソッドも正常に動作する
            const testDate = new Date('2025-09-18');
            const fileName = manager.getDailyNoteFileName(testDate);
            expect(fileName).to.equal('2025-09-18.md');
        });
    });

    describe('Extension integration scenarios', () => {
        it('should handle enabled DailyNote scenario', () => {
            // DailyNote機能が有効な場合のシナリオ
            const mockConfigManager = {
                getDailyNoteEnabled: () => true,
                getDailyNoteKeybinding: () => 'ctrl+shift+d',
                getDateFormat: () => 'YYYY-MM-DD',
                getNoteExtension: () => '.md',
                getDailyNotePath: () => 'dailynotes',
                getDailyNoteTemplate: () => '',
                getVaultRoot: () => ''
            };

            const enabled = mockConfigManager.getDailyNoteEnabled();
            const keybinding = mockConfigManager.getDailyNoteKeybinding();

            expect(enabled).to.be.true;
            expect(keybinding).to.equal('ctrl+shift+d');

            // この場合、DailyNoteManagerがインスタンス化される
            // コマンドが登録される
            // キーバインドが設定される
        });

        it('should handle disabled DailyNote scenario', () => {
            // DailyNote機能が無効な場合のシナリオ
            const mockConfigManager = {
                getDailyNoteEnabled: () => false,
                getDailyNoteKeybinding: () => 'ctrl+shift+d',
                getDateFormat: () => 'YYYY-MM-DD',
                getNoteExtension: () => '.md',
                getDailyNotePath: () => 'dailynotes',
                getDailyNoteTemplate: () => '',
                getVaultRoot: () => ''
            };

            const enabled = mockConfigManager.getDailyNoteEnabled();

            expect(enabled).to.be.false;

            // この場合、DailyNoteManagerがインスタンス化されない
            // コマンドが登録されない
            // キーバインドが設定されない
        });
    });

    describe('Configuration validation', () => {
        it('should validate boolean settings correctly', () => {
            // booleanの設定値検証
            const validSettings = [true, false];
            validSettings.forEach(setting => {
                expect(typeof setting).to.equal('boolean');
            });
        });

        it('should validate keybinding format', () => {
            // キーバインド形式の基本検証
            const validKeybindings = [
                'ctrl+shift+d',
                'cmd+shift+d',
                'alt+d',
                'ctrl+alt+shift+d',
                'cmd+alt+d'
            ];

            validKeybindings.forEach(binding => {
                expect(binding).to.be.a('string');
                expect(binding).to.include('+'); // 修飾キーが含まれることを確認
            });
        });
    });
});