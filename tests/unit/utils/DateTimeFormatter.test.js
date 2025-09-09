"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const DateTimeFormatter_1 = require("../../../src/utils/DateTimeFormatter");
(0, mocha_1.describe)('DateTimeFormatter', () => {
    let formatter;
    let testDate;
    (0, mocha_1.beforeEach)(() => {
        formatter = new DateTimeFormatter_1.DateTimeFormatter();
        // 固定の日付でテスト: 2023年12月25日 14:30:45
        testDate = new Date(2023, 11, 25, 14, 30, 45);
    });
    (0, mocha_1.describe)('日付フォーマット', () => {
        (0, mocha_1.it)('YYYY-MM-DD形式でフォーマットできる', () => {
            const result = formatter.formatDate(testDate, 'YYYY-MM-DD');
            (0, chai_1.expect)(result).to.equal('2023-12-25');
        });
        (0, mocha_1.it)('DD/MM/YYYY形式でフォーマットできる', () => {
            const result = formatter.formatDate(testDate, 'DD/MM/YYYY');
            (0, chai_1.expect)(result).to.equal('25/12/2023');
        });
        (0, mocha_1.it)('YY-M-D形式でフォーマットできる（ゼロパディングなし）', () => {
            const testDateSingle = new Date(2023, 0, 5); // 2023年1月5日
            const result = formatter.formatDate(testDateSingle, 'YY-M-D');
            (0, chai_1.expect)(result).to.equal('23-1-5');
        });
        (0, mocha_1.it)('MM/DD/YY形式でフォーマットできる', () => {
            const result = formatter.formatDate(testDate, 'MM/DD/YY');
            (0, chai_1.expect)(result).to.equal('12/25/23');
        });
        (0, mocha_1.it)('無効なフォーマットトークンは文字通り出力される', () => {
            const result = formatter.formatDate(testDate, 'YYYY年MM月DD日');
            (0, chai_1.expect)(result).to.equal('2023年12月25日');
        });
        (0, mocha_1.it)('複雑なフォーマット文字列を処理できる', () => {
            const result = formatter.formatDate(testDate, 'Report: YYYY-MM-DD');
            (0, chai_1.expect)(result).to.equal('Report: 2023-12-25');
        });
    });
    (0, mocha_1.describe)('時刻フォーマット', () => {
        (0, mocha_1.it)('HH:mm形式でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'HH:mm');
            (0, chai_1.expect)(result).to.equal('14:30');
        });
        (0, mocha_1.it)('HH:mm:ss形式でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'HH:mm:ss');
            (0, chai_1.expect)(result).to.equal('14:30:45');
        });
        (0, mocha_1.it)('H:m:s形式でフォーマットできる（ゼロパディングなし）', () => {
            const testTimeEarly = new Date(2023, 0, 1, 9, 5, 3); // 09:05:03
            const result = formatter.formatTime(testTimeEarly, 'H:m:s');
            (0, chai_1.expect)(result).to.equal('9:5:3');
        });
        (0, mocha_1.it)('12時間制（hh:mm A）でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'hh:mm A');
            (0, chai_1.expect)(result).to.equal('02:30 PM');
        });
        (0, mocha_1.it)('12時間制（h:mm a）でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'h:mm a');
            (0, chai_1.expect)(result).to.equal('2:30 pm');
        });
        (0, mocha_1.it)('午前の時刻を12時間制でフォーマットできる', () => {
            const morningTime = new Date(2023, 11, 25, 9, 15, 0);
            const result = formatter.formatTime(morningTime, 'hh:mm A');
            (0, chai_1.expect)(result).to.equal('09:15 AM');
        });
        (0, mocha_1.it)('午後12時（正午）を正しく処理できる', () => {
            const noonTime = new Date(2023, 11, 25, 12, 0, 0);
            const result = formatter.formatTime(noonTime, 'hh:mm A');
            (0, chai_1.expect)(result).to.equal('12:00 PM');
        });
        (0, mocha_1.it)('午前0時（深夜）を正しく処理できる', () => {
            const midnightTime = new Date(2023, 11, 25, 0, 0, 0);
            const result = formatter.formatTime(midnightTime, 'hh:mm A');
            (0, chai_1.expect)(result).to.equal('12:00 AM');
        });
    });
    (0, mocha_1.describe)('カスタムフォーマッター', () => {
        (0, mocha_1.it)('カスタムフォーマッターを追加できる', () => {
            formatter.addCustomFormatter('DAY_NAME', (date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[date.getDay()];
            });
            const result = formatter.formatDate(testDate, 'DAY_NAME YYYY-MM-DD');
            (0, chai_1.expect)(result).to.equal('Mon 2023-12-25');
        });
        (0, mocha_1.it)('複数のカスタムフォーマッターを使用できる', () => {
            formatter.addCustomFormatter('QUARTER', (date) => {
                const quarter = Math.floor((date.getMonth() + 3) / 3);
                return `Q${quarter}`;
            });
            formatter.addCustomFormatter('WEEKNUM', () => '52'); // 固定値でテスト
            const result = formatter.formatDate(testDate, 'QUARTER WEEKNUM YYYY');
            (0, chai_1.expect)(result).to.equal('Q4 52 2023');
        });
    });
    (0, mocha_1.describe)('フォーマット検証', () => {
        (0, mocha_1.it)('有効な日付フォーマットを検証できる', () => {
            const result = formatter.validateFormat('YYYY-MM-DD');
            (0, chai_1.expect)(result.isValid).to.be.true;
            (0, chai_1.expect)(result.error).to.be.undefined;
        });
        (0, mocha_1.it)('有効な時刻フォーマットを検証できる', () => {
            const result = formatter.validateFormat('HH:mm:ss');
            (0, chai_1.expect)(result.isValid).to.be.true;
            (0, chai_1.expect)(result.error).to.be.undefined;
        });
        (0, mocha_1.it)('無効なフォーマットでエラーを返す', () => {
            const result = formatter.validateFormat('INVALID_TOKEN');
            (0, chai_1.expect)(result.isValid).to.be.false;
            (0, chai_1.expect)(result.error).to.include('Unknown format token');
        });
        (0, mocha_1.it)('空のフォーマットは無効として処理する', () => {
            const result = formatter.validateFormat('');
            (0, chai_1.expect)(result.isValid).to.be.false;
            (0, chai_1.expect)(result.error).to.include('Format string cannot be empty');
        });
        (0, mocha_1.it)('混合フォーマット（日付+時刻）を検証できる', () => {
            const result = formatter.validateFormat('YYYY-MM-DD HH:mm:ss');
            (0, chai_1.expect)(result.isValid).to.be.true;
        });
    });
    (0, mocha_1.describe)('エッジケース', () => {
        (0, mocha_1.it)('うるう年の2月29日を正しく処理する', () => {
            const leapDay = new Date(2024, 1, 29); // 2024年2月29日
            const result = formatter.formatDate(leapDay, 'YYYY-MM-DD');
            (0, chai_1.expect)(result).to.equal('2024-02-29');
        });
        (0, mocha_1.it)('年末年始の日付を正しく処理する', () => {
            const newYear = new Date(2024, 0, 1); // 2024年1月1日
            const result = formatter.formatDate(newYear, 'YYYY-MM-DD');
            (0, chai_1.expect)(result).to.equal('2024-01-01');
        });
        (0, mocha_1.it)('異なる年代の日付を処理できる', () => {
            const oldDate = new Date(1999, 11, 31); // 1999年12月31日
            const result = formatter.formatDate(oldDate, 'YY/MM/DD');
            (0, chai_1.expect)(result).to.equal('99/12/31');
        });
    });
});
//# sourceMappingURL=DateTimeFormatter.test.js.map