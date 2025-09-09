export interface FormatValidationResult {
    readonly isValid: boolean;
    readonly error?: string;
}

export type CustomFormatterFunction = (date: Date) => string;

export class DateTimeFormatter {
    private customFormatters: Map<string, CustomFormatterFunction> = new Map();

    formatDate(date: Date, format: string): string {
        return this.applyFormatTokens(date, format);
    }

    formatTime(date: Date, format: string): string {
        return this.applyFormatTokens(date, format);
    }

    addCustomFormatter(token: string, formatter: CustomFormatterFunction): void {
        this.customFormatters.set(token, formatter);
    }

    validateFormat(format: string): FormatValidationResult {
        if (!format || format.trim() === '') {
            return {
                isValid: false,
                error: 'Format string cannot be empty'
            };
        }

        const tokens = format.match(/[A-Z]+/g) || [];
        const validTokens = ['YYYY', 'YY', 'MM', 'M', 'DD', 'D', 'HH', 'H', 'hh', 'h', 'mm', 'm', 'ss', 's', 'A', 'a'];
        
        for (const token of tokens) {
            if (!validTokens.includes(token) && !this.customFormatters.has(token)) {
                return {
                    isValid: false,
                    error: `Unknown format token: ${token}`
                };
            }
        }

        return { isValid: true };
    }

    private applyFormatTokens(date: Date, format: string): string {
        const tokenMappings = this.buildTokenMappings(date);
        return this.replaceTokensInFormat(format, tokenMappings);
    }

    private buildTokenMappings(date: Date): Array<{ token: string; value: string }> {
        const standardTokens = this.getStandardTokens(date);
        const customTokens = this.getCustomTokens(date);
        
        const allTokens = [...standardTokens, ...customTokens];
        
        // 長さの降順でソート（長いトークンから先に処理）
        return allTokens.sort((a, b) => b.token.length - a.token.length);
    }

    private getStandardTokens(date: Date): Array<{ token: string; value: string }> {
        return [
            { token: 'YYYY', value: date.getFullYear().toString() },
            { token: 'MM', value: this.padZero(date.getMonth() + 1, 2) },
            { token: 'DD', value: this.padZero(date.getDate(), 2) },
            { token: 'HH', value: this.padZero(date.getHours(), 2) },
            { token: 'hh', value: this.padZero(this.to12Hour(date.getHours()), 2) },
            { token: 'mm', value: this.padZero(date.getMinutes(), 2) },
            { token: 'ss', value: this.padZero(date.getSeconds(), 2) },
            { token: 'YY', value: date.getFullYear().toString().slice(-2) },
            { token: 'M', value: (date.getMonth() + 1).toString() },
            { token: 'D', value: date.getDate().toString() },
            { token: 'H', value: date.getHours().toString() },
            { token: 'h', value: this.to12Hour(date.getHours()).toString() },
            { token: 'm', value: date.getMinutes().toString() },
            { token: 's', value: date.getSeconds().toString() },
            { token: 'A', value: date.getHours() >= 12 ? 'PM' : 'AM' },
            { token: 'a', value: date.getHours() >= 12 ? 'pm' : 'am' }
        ];
    }

    private getCustomTokens(date: Date): Array<{ token: string; value: string }> {
        const customTokens: Array<{ token: string; value: string }> = [];
        
        for (const [token, formatter] of this.customFormatters) {
            customTokens.push({ token, value: formatter(date) });
        }
        
        return customTokens;
    }

    private replaceTokensInFormat(format: string, tokenMappings: Array<{ token: string; value: string }>): string {
        const chars = format.split('');
        const result: string[] = [];
        let i = 0;

        while (i < chars.length) {
            const matchedToken = this.findMatchingToken(chars, i, tokenMappings);
            
            if (matchedToken) {
                result.push(matchedToken.value);
                i += matchedToken.token.length;
            } else {
                result.push(chars[i]);
                i++;
            }
        }

        return result.join('');
    }

    private findMatchingToken(chars: string[], position: number, tokenMappings: Array<{ token: string; value: string }>): { token: string; value: string } | null {
        for (const { token, value } of tokenMappings) {
            if (position + token.length <= chars.length) {
                const substring = chars.slice(position, position + token.length).join('');
                if (substring === token) {
                    return { token, value };
                }
            }
        }
        return null;
    }

    private padZero(num: number, length: number): string {
        return num.toString().padStart(length, '0');
    }

    private to12Hour(hour24: number): number {
        if (hour24 === 0) {
            return 12; // 午前0時は12AM
        } else if (hour24 <= 12) {
            return hour24; // 午前1時〜午後12時
        } else {
            return hour24 - 12; // 午後1時〜午後11時
        }
    }
}