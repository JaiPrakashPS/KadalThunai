import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { setLanguage as i18nSetLanguage } from '../i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(i18n.locale || 'ta');

  useEffect(() => {
    const loadLang = async () => {
      try {
        const stored = await AsyncStorage.getItem('preferredLanguage');
        if (stored) {
          i18n.locale = stored;
          setLang(stored);
        }
      } catch (e) {
        console.warn('Failed to load language from storage', e);
      }
    };
    loadLang();
  }, []);

  const changeLanguage = async (newLang) => {
    try {
      await i18nSetLanguage(newLang);
      setLang(newLang);
    } catch (e) {
      console.warn('Failed to set language', e);
    }
  };

  const t = (key, options) => {
    return i18n.t(key, options);
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
