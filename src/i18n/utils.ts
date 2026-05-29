import { ui, defaultLang, type Lang, type TranslationKey } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

export function localizedPath(lang: Lang, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/${lang}${cleanPath === '/' ? '' : cleanPath}`;
}

export function alternateLangPath(currentLang: Lang, url: URL): string {
  const otherLang: Lang = currentLang === 'en' ? 'es' : 'en';
  const segments = url.pathname.split('/').filter(Boolean);
  segments[0] = otherLang;
  return '/' + segments.join('/');
}
