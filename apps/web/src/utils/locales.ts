import type { Locale } from 'date-fns';
import { enUS, es, fr, it, pt } from 'date-fns/locale';

export const SUPPORTED_LOCALES = ['en', 'fr', 'it', 'es', 'pt'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const getLocaleName = (locale: string) => {
  const localeMap: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    it: 'Italiano',
    es: 'Español',
    // Portugal's Portuguese: a Brazilian one would be a locale of its own
    pt: 'Português',
  };
  return localeMap[locale] || locale;
};

export const getDateLocale = (locale: string) => {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    it: 'it-IT',
    es: 'es-ES',
    pt: 'pt-PT',
  };
  return localeMap[locale] || locale;
};

export const getDateFnsLocale = (locale: string) => {
  const localeMap: Record<string, Locale> = {
    en: enUS,
    fr,
    it,
    es,
    pt,
  };
  return localeMap[locale] || enUS;
};
