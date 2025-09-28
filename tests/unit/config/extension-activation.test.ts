// expect はテストsetup.tsからグローバルにインポート済み
const expect = (global as any).expect;
import * as path from 'path';
import * as fs from 'fs';

/**
 * Extension Activation Configuration Tests
 *
 * package.jsonのactivationEventsとコマンド定義の整合性をテストする
 * ADR-012: Extension Activation Fix の回帰防止テスト
 */
describe('Extension Activation Configuration', () => {
    let packageJson: any;

    before(() => {
        // package.jsonを読み込み
        const packageJsonPath = path.join(__dirname, '..', '..', '..', 'package.json');
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        packageJson = JSON.parse(packageJsonContent);
    });

    describe('activationEvents と commands の整合性', () => {
        it('すべてのコマンドに対応するactivationEventが存在すること', () => {
            // package.jsonからコマンドリストを取得
            const commands = packageJson.contributes.commands || [];
            const commandIds = commands.map((cmd: any) => cmd.command);

            // activationEventsからコマンド関連のイベントを抽出
            const activationEvents = packageJson.activationEvents || [];
            const commandActivationEvents = activationEvents
                .filter((event: string) => event.startsWith('onCommand:'))
                .map((event: string) => event.replace('onCommand:', ''));

            // 各コマンドに対応するactivationEventがあることを確認
            commandIds.forEach((commandId: string) => {
                expect(
                    commandActivationEvents,
                    `コマンド "${commandId}" に対応するactivationEvent "onCommand:${commandId}" が見つかりません`
                ).to.include(commandId);
            });
        });

        it('activationEventsに未定義のコマンドが含まれていないこと', () => {
            // package.jsonからコマンドリストを取得
            const commands = packageJson.contributes.commands || [];
            const commandIds = commands.map((cmd: any) => cmd.command);

            // activationEventsからコマンド関連のイベントを抽出
            const activationEvents = packageJson.activationEvents || [];
            const commandActivationEvents = activationEvents
                .filter((event: string) => event.startsWith('onCommand:'))
                .map((event: string) => event.replace('onCommand:', ''));

            // activationEventsに含まれるコマンドがすべて定義済みであることを確認
            commandActivationEvents.forEach((commandId: string) => {
                expect(
                    commandIds,
                    `activationEvent "onCommand:${commandId}" に対応するコマンド定義が見つかりません`
                ).to.include(commandId);
            });
        });

        it('必須コマンドがすべて定義されていること', () => {
            const commands = packageJson.contributes.commands || [];
            const commandIds = commands.map((cmd: any) => cmd.command);

            // 必須コマンドリスト
            const requiredCommands = [
                'obsd.openOrCreateWikiLink',
                'obsd.insertDate',
                'obsd.insertTime',
                'obsd.preview',
                'obsd.openDailyNote'  // ADR-012で修正されたコマンド
            ];

            requiredCommands.forEach(requiredCommand => {
                expect(
                    commandIds,
                    `必須コマンド "${requiredCommand}" が定義されていません`
                ).to.include(requiredCommand);
            });
        });

        it('必須activationEventsがすべて定義されていること', () => {
            const activationEvents = packageJson.activationEvents || [];

            // 必須activationEventリスト
            const requiredActivationEvents = [
                'onLanguage:markdown',
                'onCommand:obsd.openOrCreateWikiLink',
                'onCommand:obsd.insertDate',
                'onCommand:obsd.insertTime',
                'onCommand:obsd.preview',
                'onCommand:obsd.openDailyNote'  // ADR-012で追加されたイベント
            ];

            requiredActivationEvents.forEach(requiredEvent => {
                expect(
                    activationEvents,
                    `必須activationEvent "${requiredEvent}" が定義されていません`
                ).to.include(requiredEvent);
            });
        });
    });

    describe('コマンド定義の妥当性', () => {
        it('すべてのコマンドがタイトルを持つこと', () => {
            const commands = packageJson.contributes.commands || [];

            commands.forEach((command: any) => {
                expect(command.title, `コマンド "${command.command}" にタイトルが設定されていません`)
                    .to.be.a('string')
                    .and.not.be.empty;
            });
        });

        it('すべてのコマンドがカテゴリを持つこと', () => {
            const commands = packageJson.contributes.commands || [];

            commands.forEach((command: any) => {
                expect(command.category, `コマンド "${command.command}" にカテゴリが設定されていません`)
                    .to.be.a('string')
                    .and.not.be.empty;
            });
        });

        it('コマンドIDが正しいプレフィックスを持つこと', () => {
            const commands = packageJson.contributes.commands || [];
            const expectedPrefix = 'obsd.';

            commands.forEach((command: any) => {
                expect(
                    command.command,
                    `コマンド "${command.command}" が期待されるプレフィックス "${expectedPrefix}" で始まっていません`
                ).to.match(new RegExp(`^${expectedPrefix.replace('.', '\\.')}`));
            });
        });
    });

    describe('package.json構造の妥当性', () => {
        it('拡張機能メタデータが適切に設定されていること', () => {
            expect(packageJson.name).to.equal('obsidianforcode');
            expect(packageJson.displayName).to.equal('Obsidian for Code');
            expect(packageJson.main).to.equal('./out/src/extension.js');
        });

        it('VS Codeエンジンバージョンが設定されていること', () => {
            expect(packageJson.engines).to.have.property('vscode');
            expect(packageJson.engines.vscode).to.be.a('string').and.not.be.empty;
        });

        it('contributes セクションが適切に構成されていること', () => {
            expect(packageJson.contributes).to.be.an('object');
            expect(packageJson.contributes).to.have.property('commands');
            expect(packageJson.contributes).to.have.property('configuration');
        });
    });

    describe('回帰防止テスト - ADR-012', () => {
        it('obsd.openDailyNote コマンドのactivationEventが存在すること', () => {
            const activationEvents = packageJson.activationEvents || [];

            expect(
                activationEvents,
                'ADR-012で修正された obsd.openDailyNote のactivationEventが欠落しています'
            ).to.include('onCommand:obsd.openDailyNote');
        });

        it('DailyNote関連の設定が適切に定義されていること', () => {
            const configuration = packageJson.contributes.configuration;
            const properties = configuration.properties;

            // DailyNote関連の設定項目をチェック
            const dailyNoteSettings = [
                'obsd.dailyNoteEnabled',
                'obsd.dailyNotePath',
                'obsd.dailyNoteTemplate',
                'obsd.dailyNoteKeybindingGuide'
            ];

            dailyNoteSettings.forEach(setting => {
                expect(
                    properties,
                    `DailyNote設定 "${setting}" が定義されていません`
                ).to.have.property(setting);
            });
        });

        it('DailyNoteコマンドが適切なカテゴリに分類されていること', () => {
            const commands = packageJson.contributes.commands || [];
            const dailyNoteCommand = commands.find((cmd: any) => cmd.command === 'obsd.openDailyNote');

            expect(dailyNoteCommand, 'obsd.openDailyNote コマンドが見つかりません').to.exist;
            expect(dailyNoteCommand.category).to.equal('Obsidian for Code');
        });
    });
});