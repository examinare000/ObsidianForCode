export type SlugStrategy = 'passthrough' | 'kebab-case' | 'snake_case';

export interface ObsdConfiguration {
    readonly vaultRoot: string;
    readonly noteExtension: string;
    readonly slugStrategy: SlugStrategy;
    readonly dateFormat: string;
    readonly timeFormat: string;
    readonly template: string;
}

export interface ValidationError {
    readonly field: keyof ObsdConfiguration;
    readonly message: string;
    readonly code: string;
}

export interface ValidationWarning {
    readonly field: keyof ObsdConfiguration;
    readonly message: string;
    readonly recommendedValue?: string;
}

export interface ValidationResult {
    readonly isValid: boolean;
    readonly errors: ValidationError[];
    readonly warnings: ValidationWarning[];
}

export interface Disposable {
    dispose(): void;
}

export interface WorkspaceConfiguration {
    get<T>(key: string, defaultValue?: T): T;
    has(key: string): boolean;
    update(key: string, value: any): Thenable<void> | Promise<void>;
}

export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'obsd';
    private changeListeners: ((config: ObsdConfiguration) => void)[] = [];
    
    constructor(private config: WorkspaceConfiguration) {}

    getVaultRoot(): string {
        return this.config.get<string>('obsd.vaultRoot', '');
    }

    getNoteExtension(): string {
        return this.config.get<string>('obsd.noteExtension', '.md');
    }

    getSlugStrategy(): SlugStrategy {
        const strategy = this.config.get<string>('obsd.slugStrategy', 'passthrough');
        
        if (this.isValidSlugStrategy(strategy)) {
            return strategy as SlugStrategy;
        }
        
        return 'passthrough';
    }

    getDateFormat(): string {
        return this.config.get<string>('obsd.dateFormat', 'YYYY-MM-DD');
    }

    getTimeFormat(): string {
        return this.config.get<string>('obsd.timeFormat', 'HH:mm');
    }

    getTemplate(): string {
        return this.config.get<string>('obsd.template', '');
    }

    getConfiguration(): ObsdConfiguration {
        return {
            vaultRoot: this.getVaultRoot(),
            noteExtension: this.getNoteExtension(),
            slugStrategy: this.getSlugStrategy(),
            dateFormat: this.getDateFormat(),
            timeFormat: this.getTimeFormat(),
            template: this.getTemplate()
        };
    }

    validateConfiguration(config: Partial<ObsdConfiguration>): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // SlugStrategy validation
        if (config.slugStrategy !== undefined && !this.isValidSlugStrategy(config.slugStrategy)) {
            errors.push({
                field: 'slugStrategy',
                message: `Invalid slug strategy: ${config.slugStrategy}`,
                code: 'INVALID_SLUG_STRATEGY'
            });
        }

        // VaultRoot validation
        if (config.vaultRoot !== undefined && config.vaultRoot === '') {
            warnings.push({
                field: 'vaultRoot',
                message: 'Vault root is empty, workspace root will be used',
                recommendedValue: 'Set a specific vault path'
            });
        }

        // DateFormat validation
        if (config.dateFormat !== undefined && !this.isValidDateFormat(config.dateFormat)) {
            errors.push({
                field: 'dateFormat',
                message: `Invalid date format: ${config.dateFormat}`,
                code: 'INVALID_DATE_FORMAT'
            });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    onConfigurationChanged(callback: (config: ObsdConfiguration) => void): Disposable {
        this.changeListeners.push(callback);
        
        return {
            dispose: () => {
                const index = this.changeListeners.indexOf(callback);
                if (index >= 0) {
                    this.changeListeners.splice(index, 1);
                }
            }
        };
    }

    // テスト用メソッド - 本番では VS Code API のイベントで呼ばれる
    triggerConfigurationChanged(): void {
        const config = this.getConfiguration();
        this.changeListeners.forEach(listener => listener(config));
    }

    private isValidSlugStrategy(strategy: string): strategy is SlugStrategy {
        return ['passthrough', 'kebab-case', 'snake_case'].includes(strategy);
    }

    private isValidDateFormat(format: string): boolean {
        // 基本的な日付フォーマットトークンの検証
        const validTokens = ['YYYY', 'YY', 'MM', 'M', 'DD', 'D'];
        const formatTokens = format.match(/[A-Z]+/g) || [];
        
        // 空の場合やトークンが見つからない場合は無効
        if (formatTokens.length === 0) {
            return false;
        }
        
        return formatTokens.every(token => validTokens.includes(token));
    }
}