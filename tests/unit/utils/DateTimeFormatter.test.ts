import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { DateTimeFormatter } from '../../../src/utils/DateTimeFormatter';

describe('DateTimeFormatter', () => {
    let formatter: DateTimeFormatter;
    let testDate: Date;

    beforeEach(() => {
        formatter = new DateTimeFormatter();
        // 固定の日付でテスト: 2023年12月25日 14:30:45
        testDate = new Date(2023, 11, 25, 14, 30, 45);
    });

    describe('日付フォーマット', () => {
        it('YYYY-MM-DD形式でフォーマットできる', () => {
            const result = formatter.formatDate(testDate, 'YYYY-MM-DD');
            expect(result).to.equal('2023-12-25');
        });

        it('DD/MM/YYYY形式でフォーマットできる', () => {
            const result = formatter.formatDate(testDate, 'DD/MM/YYYY');
            expect(result).to.equal('25/12/2023');
        });

        it('YY-M-D形式でフォーマットできる（ゼロパディングなし）', () => {
            const testDateSingle = new Date(2023, 0, 5); // 2023年1月5日
            const result = formatter.formatDate(testDateSingle, 'YY-M-D');
            expect(result).to.equal('23-1-5');
        });

        it('MM/DD/YY形式でフォーマットできる', () => {
            const result = formatter.formatDate(testDate, 'MM/DD/YY');
            expect(result).to.equal('12/25/23');
        });

        it('無効なフォーマットトークンは文字通り出力される', () => {
            const result = formatter.formatDate(testDate, 'YYYY年MM月DD日');
            expect(result).to.equal('2023年12月25日');
        });

        it('複雑なフォーマット文字列を処理できる', () => {
            const result = formatter.formatDate(testDate, 'Report: YYYY-MM-DD');
            expect(result).to.equal('Report: 2023-12-25');
        });
    });

    describe('時刻フォーマット', () => {
        it('HH:mm形式でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'HH:mm');
            expect(result).to.equal('14:30');
        });

        it('HH:mm:ss形式でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'HH:mm:ss');
            expect(result).to.equal('14:30:45');
        });

        it('H:m:s形式でフォーマットできる（ゼロパディングなし）', () => {
            const testTimeEarly = new Date(2023, 0, 1, 9, 5, 3); // 09:05:03
            const result = formatter.formatTime(testTimeEarly, 'H:m:s');
            expect(result).to.equal('9:5:3');
        });

        it('12時間制（hh:mm A）でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'hh:mm A');
            expect(result).to.equal('02:30 PM');
        });

        it('12時間制（h:mm a）でフォーマットできる', () => {
            const result = formatter.formatTime(testDate, 'h:mm a');
            expect(result).to.equal('2:30 pm');
        });

        it('午前の時刻を12時間制でフォーマットできる', () => {
            const morningTime = new Date(2023, 11, 25, 9, 15, 0);
            const result = formatter.formatTime(morningTime, 'hh:mm A');
            expect(result).to.equal('09:15 AM');
        });

        it('午後12時（正午）を正しく処理できる', () => {
            const noonTime = new Date(2023, 11, 25, 12, 0, 0);
            const result = formatter.formatTime(noonTime, 'hh:mm A');
            expect(result).to.equal('12:00 PM');
        });

        it('午前0時（深夜）を正しく処理できる', () => {
            const midnightTime = new Date(2023, 11, 25, 0, 0, 0);
            const result = formatter.formatTime(midnightTime, 'hh:mm A');
            expect(result).to.equal('12:00 AM');
        });
    });

    describe('カスタムフォーマッター', () => {
        it('カスタムフォーマッターを追加できる', () => {
            formatter.addCustomFormatter('DAY_NAME', (date: Date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[date.getDay()];
            });

            const result = formatter.formatDate(testDate, 'DAY_NAME YYYY-MM-DD');
            expect(result).to.equal('Mon 2023-12-25');
        });

        it('複数のカスタムフォーマッターを使用できる', () => {
            formatter.addCustomFormatter('QUARTER', (date: Date) => {
                const quarter = Math.floor((date.getMonth() + 3) / 3);
                return `Q${quarter}`;
            });

            formatter.addCustomFormatter('WEEKNUM', () => '52'); // 固定値でテスト

            const result = formatter.formatDate(testDate, 'QUARTER WEEKNUM YYYY');
            expect(result).to.equal('Q4 52 2023');
        });
    });

    describe('フォーマット検証', () => {
        it('有効な日付フォーマットを検証できる', () => {
            const result = formatter.validateFormat('YYYY-MM-DD');
            expect(result.isValid).to.be.true;
            expect(result.error).to.be.undefined;
        });

        it('有効な時刻フォーマットを検証できる', () => {
            const result = formatter.validateFormat('HH:mm:ss');
            expect(result.isValid).to.be.true;
            expect(result.error).to.be.undefined;
        });

        it('無効なフォーマットでエラーを返す', () => {
            const result = formatter.validateFormat('INVALID_TOKEN');
            expect(result.isValid).to.be.false;
            expect(result.error).to.include('Unknown format token');
        });

        it('空のフォーマットは無効として処理する', () => {
            const result = formatter.validateFormat('');
            expect(result.isValid).to.be.false;
            expect(result.error).to.include('Format string cannot be empty');
        });

        it('混合フォーマット（日付+時刻）を検証できる', () => {
            const result = formatter.validateFormat('YYYY-MM-DD HH:mm:ss');
            expect(result.isValid).to.be.true;
        });
    });

    describe('エッジケース', () => {
        it('うるう年の2月29日を正しく処理する', () => {
            const leapDay = new Date(2024, 1, 29); // 2024年2月29日
            const result = formatter.formatDate(leapDay, 'YYYY-MM-DD');
            expect(result).to.equal('2024-02-29');
        });

        it('年末年始の日付を正しく処理する', () => {
            const newYear = new Date(2024, 0, 1); // 2024年1月1日
            const result = formatter.formatDate(newYear, 'YYYY-MM-DD');
            expect(result).to.equal('2024-01-01');
        });

        it('異なる年代の日付を処理できる', () => {
            const oldDate = new Date(1999, 11, 31); // 1999年12月31日
            const result = formatter.formatDate(oldDate, 'YY/MM/DD');
            expect(result).to.equal('99/12/31');
        });
    });
});