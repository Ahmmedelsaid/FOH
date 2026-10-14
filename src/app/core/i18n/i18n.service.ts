import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { MenuItem } from '../models/menu.model';
import { AR, EN } from './translations';

export type Lang = 'en' | 'ar';

const STORAGE_KEY = 'lang';
const DICTIONARIES: Record<Lang, Record<string, string>> = { en: EN, ar: AR };

export type TranslateParams = Record<string, string | number>;

/**
 * Tiny runtime i18n. The language is a signal, so any template or computed that calls `t()`
 * updates when it changes. Angular's built-in i18n needs one build per language, which does not
 * fit a toggle button.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);

  readonly lang = signal<Lang>(this.readSavedLang());
  readonly dir = computed(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));

  private readonly dictionary = computed(() => DICTIONARIES[this.lang()]);
  private readonly pluralRules = computed(() => new Intl.PluralRules(this.lang()));
  /** Latin digits in both languages, so order numbers and prices look the same everywhere. */
  private readonly locale = computed(() => (this.lang() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US'));

  constructor() {
    effect(() => {
      const root = this.document.documentElement;
      root.lang = this.lang();
      root.dir = this.dir();
    });
  }

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be blocked (private mode); the language still changes for this session.
    }
  }

  toggle(): void {
    this.setLang(this.lang() === 'ar' ? 'en' : 'ar');
  }

  /**
   * Looks up `key` and fills `{placeholders}`. When `params.count` is a number, the plural form
   * `key.<category>` is used (Arabic has six categories; English has two).
   */
  t(key: string, params?: TranslateParams): string {
    const dictionary = this.dictionary();
    let template: string | undefined;

    const count = params?.['count'];
    if (typeof count === 'number') {
      const category = this.pluralRules().select(count);
      template = dictionary[`${key}.${category}`] ?? dictionary[`${key}.other`];
    }
    template ??= dictionary[key] ?? key;

    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      params && name in params ? String(params[name]) : placeholder,
    );
  }

  /** Menu names come from the API in English only; known ids are translated, others fall back. */
  menuName(item: Pick<MenuItem, 'id' | 'name'>): string {
    const key = `menu.${item.id}`;
    return key in this.dictionary() ? this.t(key) : item.name;
  }

  categoryName(category: string): string {
    const key = `category.${category}`;
    return key in this.dictionary() ? this.t(key) : category;
  }

  /** 1234.5 -> '1,234.50' (same in both languages). */
  number(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** 'EGP 1,234.50' or '1,234.50 ج.م'. */
  money(amount: number): string {
    return this.t('money', { amount: this.number(amount) });
  }

  time(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(this.locale());
  }

  dateTime(isoString: string): string {
    return new Date(isoString).toLocaleString(this.locale(), { dateStyle: 'medium', timeStyle: 'short' });
  }

  private readSavedLang(): Lang {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  }
}
