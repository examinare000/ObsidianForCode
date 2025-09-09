"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const WikiLinkProcessor_1 = require("../../../src/processors/WikiLinkProcessor");
(0, mocha_1.describe)('WikiLinkProcessor', () => {
    let processor;
    beforeEach(() => {
        processor = new WikiLinkProcessor_1.WikiLinkProcessor();
    });
    (0, mocha_1.describe)('parseWikiLink', () => {
        (0, mocha_1.it)('シンプルなWikiLinkを解析できる', () => {
            // テスト対象: [[Simple Page]]
            const linkText = 'Simple Page';
            const result = processor.parseWikiLink(linkText);
            const expected = {
                pageName: 'Simple Page',
                isAlias: false
            };
            (0, chai_1.expect)(result).to.deep.equal(expected);
        });
        (0, mocha_1.it)('別名付きWikiLinkを解析できる', () => {
            // テスト対象: [[Target Page|Display Name]]
            const linkText = 'Target Page|Display Name';
            const result = processor.parseWikiLink(linkText);
            const expected = {
                pageName: 'Target Page',
                displayName: 'Display Name',
                isAlias: true
            };
            (0, chai_1.expect)(result).to.deep.equal(expected);
        });
        (0, mocha_1.it)('見出しリンクを解析できる', () => {
            // テスト対象: [[Page Name#Heading]]
            const linkText = 'Page Name#Heading';
            const result = processor.parseWikiLink(linkText);
            const expected = {
                pageName: 'Page Name',
                heading: 'Heading',
                isAlias: false
            };
            (0, chai_1.expect)(result).to.deep.equal(expected);
        });
        (0, mocha_1.it)('複雑なWikiLink（別名+見出し）を解析できる', () => {
            // テスト対象: [[Target#Section|Display]]
            const linkText = 'Target#Section|Display';
            const result = processor.parseWikiLink(linkText);
            const expected = {
                pageName: 'Target',
                heading: 'Section',
                displayName: 'Display',
                isAlias: true
            };
            (0, chai_1.expect)(result).to.deep.equal(expected);
        });
        (0, mocha_1.it)('空文字を渡すとWikiLinkErrorを投げる', () => {
            (0, chai_1.expect)(() => processor.parseWikiLink('')).to.throw(WikiLinkProcessor_1.WikiLinkError, 'WikiLink text cannot be empty');
        });
        (0, mocha_1.it)('前後の空白を除去する', () => {
            const linkText = '  Trimmed Page  ';
            const result = processor.parseWikiLink(linkText);
            (0, chai_1.expect)(result.pageName).to.equal('Trimmed Page');
        });
    });
    (0, mocha_1.describe)('ファイル名変換機能', () => {
        (0, mocha_1.it)('passthroughモードでは元の名前を保持する', () => {
            const processor = new WikiLinkProcessor_1.WikiLinkProcessor({ slugStrategy: 'passthrough' });
            const result = processor.transformFileName('My Test Page');
            (0, chai_1.expect)(result).to.equal('My Test Page');
        });
        (0, mocha_1.it)('kebab-caseモードではハイフン区切りに変換する', () => {
            const processor = new WikiLinkProcessor_1.WikiLinkProcessor({ slugStrategy: 'kebab-case' });
            const result = processor.transformFileName('My Test Page');
            (0, chai_1.expect)(result).to.equal('my-test-page');
        });
        (0, mocha_1.it)('snake_caseモードではアンダースコア区切りに変換する', () => {
            const processor = new WikiLinkProcessor_1.WikiLinkProcessor({ slugStrategy: 'snake_case' });
            const result = processor.transformFileName('My Test Page');
            (0, chai_1.expect)(result).to.equal('my_test_page');
        });
        (0, mocha_1.it)('特殊文字を安全な文字に変換する', () => {
            const processor = new WikiLinkProcessor_1.WikiLinkProcessor({ slugStrategy: 'kebab-case' });
            const result = processor.transformFileName('Page with/special:chars?');
            (0, chai_1.expect)(result).to.equal('page-with-special-chars');
        });
    });
});
//# sourceMappingURL=WikiLinkProcessor.test.js.map