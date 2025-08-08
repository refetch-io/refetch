// Locale utilities for the enhanced LLM system

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' }
];

export class LocaleUtils {
  /**
   * Get locale information by code
   */
  static getLocaleInfo(code: string): LocaleInfo | undefined {
    return SUPPORTED_LOCALES.find(locale => locale.code === code);
  }

  /**
   * Get display name for a locale code
   */
  static getDisplayName(code: string, useNativeName: boolean = false): string {
    const locale = this.getLocaleInfo(code);
    if (!locale) return code;
    
    return useNativeName ? locale.nativeName : locale.name;
  }

  /**
   * Get all supported locale codes
   */
  static getSupportedCodes(): string[] {
    return SUPPORTED_LOCALES.map(locale => locale.code);
  }

  /**
   * Check if a locale code is supported
   */
  static isSupported(code: string): boolean {
    return SUPPORTED_LOCALES.some(locale => locale.code === code);
  }

  /**
   * Get locale info for all supported locales
   */
  static getAllLocales(): LocaleInfo[] {
    return [...SUPPORTED_LOCALES];
  }

  /**
   * Format locale for display (e.g., "English (en)" or "Español (es)")
   */
  static formatLocale(code: string, showCode: boolean = true): string {
    const locale = this.getLocaleInfo(code);
    if (!locale) return code;
    
    if (showCode) {
      return `${locale.nativeName} (${locale.code})`;
    }
    
    return locale.nativeName;
  }
}
