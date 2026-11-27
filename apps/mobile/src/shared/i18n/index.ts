import { getLocales } from 'expo-localization';
import { en, type MessageKey } from './en';
import { ru } from './ru';

export type { MessageKey } from './en';

type Locale = 'en' | 'ru';

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, ru };

export const currentLocale = (): Locale => (getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'en');

// Placeholders are {name}; values come from the app, never from server text.
export const t = (key: MessageKey, params: Readonly<Record<string, string>> = {}): string =>
  Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    DICTIONARIES[currentLocale()][key],
  );
