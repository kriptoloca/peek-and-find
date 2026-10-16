/** The ≤ 10 UI strings (GDD: text-free gameplay). English by default, i18n-ready. */
export type Locale = 'en';

const STRINGS: Record<Locale, { play: string; daily: string; title: string }> = {
  en: { play: 'PLAY', daily: 'DAILY', title: 'Peek & Find' },
};

export function t(locale: Locale = 'en'): (typeof STRINGS)[Locale] {
  return STRINGS[locale];
}
