import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import ta from './ta.json';

const i18n = new I18n({ en, ta });

i18n.enableFallback = true;
i18n.defaultLocale = 'ta';
i18n.locale = 'ta';

/**
 * Initialize i18n with stored language preference
 */
export const initI18n = async () => {
  try {
    const stored = await AsyncStorage.getItem('preferredLanguage');
    if (stored) {
      i18n.locale = stored;
    }
  } catch (_) {
    // Fall back to Tamil
  }
};

/**
 * Change app language and persist
 */
export const setLanguage = async (lang) => {
  i18n.locale = lang;
  await AsyncStorage.setItem('preferredLanguage', lang);
};

/**
 * Get current locale
 */
export const getLocale = () => i18n.locale;

/**
 * Translate key
 */
export const t = (key, options) => i18n.t(key, options);

export default i18n;
