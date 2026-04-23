export type Locale = 'en' | 'vi' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de';

interface TranslationCategory {
  [key: string]: string;
}

interface Translations {
  [locale: string]: {
    [category: string]: TranslationCategory;
  };
}

const defaultTranslations: Translations = {
  en: {
    overlay: {
      debugTitle: "Debug Overlay",
      debugClose: "Press any key to close",
    },
    command: {
      unknown: "Unknown command: %s",
      usage: "Usage: /%s %s",
    },
    error: {
      generic: "An error occurred",
      connection: "Connection error",
      timeout: "Operation timed out",
    },
    tui: {
      welcome: "Welcome to Pi SDK Agent",
      typing: "typing...",
    },
  },
  vi: {
    overlay: {
      debugTitle: "Gỡ lỗi",
      debugClose: "Nhấn phím bất kỳ để đóng",
    },
    command: {
      unknown: "Lệnh không tồn tại: %s",
      usage: "Cách dùng: /%s %s",
    },
    error: {
      generic: "Đã xảy ra lỗi",
      connection: "Lỗi kết nối",
      timeout: "Thao tác hết thời gian",
    },
    tui: {
      welcome: "Chào mừng đến với Pi SDK Agent",
      typing: "đang gõ...",
    },
  },
};

let currentLocale: Locale = 'en';

/**
 * Set current locale
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Get current locale
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translate a key in a category
 */
export function t(locale: Locale, key: string, category: string = 'general'): string {
  const loc = defaultTranslations[locale] || defaultTranslations['en'];
  const cat = loc[category] || {};
  return cat[key] || key;
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): Locale[] {
  return Object.keys(defaultTranslations) as Locale[];
}
