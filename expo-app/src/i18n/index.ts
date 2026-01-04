/**
 * i18n configuration for multi-language support
 * Using a simple implementation compatible with React Native/Expo
 */
import * as Localization from 'expo-localization';

// Import translations
import en from './translations/en';
import ms from './translations/ms';
import zh from './translations/zh';
import ta from './translations/ta';

// All available translations
const translations: Record<string, any> = {
    en,
    ms,
    zh,
    ta,
};

// Current locale
let currentLocale = 'en';

// Language mapping from user preferences to i18n locale codes
export const LANGUAGE_TO_LOCALE: Record<string, string> = {
    'en': 'en',
    'ms': 'ms',
    'zh': 'zh',
    'zh-CN': 'zh',
    'zh-TW': 'zh',
    'ta': 'ta',  // Tamil now supported
    'id': 'en',  // Fallback to English
    'th': 'en',
    'vi': 'en',
    'tl': 'en',
    'hi': 'en',
    'ja': 'en',
    'ko': 'en',
    'ar': 'en',
    'fr': 'en',
    'de': 'en',
    'es': 'en',
};

// Available languages for UI display
export const AVAILABLE_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
];

/**
 * Set the app locale based on user preference or device settings
 */
export function setLocale(languageCode?: string | null): void {
    if (languageCode) {
        currentLocale = LANGUAGE_TO_LOCALE[languageCode] || 'en';
    } else {
        const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
        currentLocale = LANGUAGE_TO_LOCALE[deviceLocale] || 'en';
    }
}

/**
 * Get current locale
 */
export function getLocale(): string {
    return currentLocale;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string | undefined {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return undefined;
        }
    }

    return typeof result === 'string' ? result : undefined;
}

/**
 * Translate function with interpolation support
 */
export function t(key: string, options?: Record<string, string | number>): string {
    // Get translation from current locale or fallback to English
    let translation = getNestedValue(translations[currentLocale], key);

    if (!translation) {
        translation = getNestedValue(translations.en, key);
    }

    if (!translation) {
        return key; // Return key if no translation found
    }

    // Handle interpolation (e.g., {{count}})
    if (options) {
        Object.entries(options).forEach(([optKey, value]) => {
            translation = translation!.replace(new RegExp(`\\{\\{${optKey}\\}\\}`, 'g'), String(value));
        });
    }

    return translation;
}

// Initialize with device locale
setLocale();

export default { t, setLocale, getLocale };
