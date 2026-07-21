import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation JSON resources statically for bulletproof performance and iframe compatibility
import uzTranslations from './locales/uz.json';
import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';
import arTranslations from './locales/ar.json';
import frTranslations from './locales/fr.json';
import zhTranslations from './locales/zh.json';
import koTranslations from './locales/ko.json';
import hiTranslations from './locales/hi.json';

const resources = {
  uz: { translation: uzTranslations },
  en: { translation: enTranslations },
  ru: { translation: ruTranslations },
  ar: { translation: arTranslations },
  fr: { translation: frTranslations },
  zh: { translation: zhTranslations },
  ko: { translation: koTranslations },
  hi: { translation: hiTranslations }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uz',
    debug: false,
    interpolation: {
      escapeValue: false // React already escapes values to prevent XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Handle side-effects (HTML lang attribute, RTL support) on language initialization/change
const updateDocumentAttributes = (lng: string) => {
  if (!lng) return;
  document.documentElement.lang = lng;
  if (lng === 'ar') {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
};

// Listen for language changes and apply attributes
i18n.on('languageChanged', (lng) => {
  updateDocumentAttributes(lng);
});

// Apply attributes for initial language
updateDocumentAttributes(i18n.resolvedLanguage || i18n.language || 'uz');

export default i18n;
