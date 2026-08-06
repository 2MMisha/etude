export type Lang = 'he' | 'en' | 'ru';

export const LANGUAGES: Record<Lang, { label: string; dir: 'rtl' | 'ltr'; htmlLang: string; locale: string }> = {
  he: { label: 'עברית', dir: 'rtl', htmlLang: 'he', locale: 'he_IL' },
  en: { label: 'English', dir: 'ltr', htmlLang: 'en', locale: 'en_US' },
  ru: { label: 'Русский', dir: 'ltr', htmlLang: 'ru', locale: 'ru_RU' },
};

export const ALL_LANGS: Lang[] = ['he', 'en', 'ru'];
export const DEFAULT_LANG: Lang = 'he';

export function isLang(value: string): value is Lang {
  return (ALL_LANGS as string[]).includes(value);
}

/** Build a path prefixed with the given language, e.g. localizePath('en', '/about') -> '/en/about' */
export function localizePath(lang: Lang, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `/${lang}${clean === '/' ? '' : clean}`;
}

/** Given a path like /en/about, strip the language prefix to get /about */
export function stripLangPrefix(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length && isLang(parts[0])) {
    parts.shift();
  }
  return '/' + parts.join('/');
}
