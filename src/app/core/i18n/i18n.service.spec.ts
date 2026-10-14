import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { AR, EN } from './translations';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.removeItem('lang');
    service = TestBed.inject(I18nService);
  });

  afterEach(() => localStorage.removeItem('lang'));

  it('defaults to English, left-to-right', () => {
    expect(service.lang()).toBe('en');
    expect(service.dir()).toBe('ltr');
  });

  it('switches language and direction, and remembers the choice', () => {
    service.toggle();
    TestBed.flushEffects();

    expect(service.lang()).toBe('ar');
    expect(service.dir()).toBe('rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(localStorage.getItem('lang')).toBe('ar');
  });

  it('fills placeholders and keeps unknown ones visible', () => {
    expect(service.t('board.created', { number: 1046 })).toBe('Order #1046 was created.');
    expect(service.t('board.created')).toBe('Order #{number} was created.');
  });

  it('returns the key when it is missing instead of an empty string', () => {
    expect(service.t('does.not.exist')).toBe('does.not.exist');
  });

  it('picks the plural form for the current language', () => {
    expect(service.t('card.items', { count: 1 })).toBe('1 item');
    expect(service.t('card.items', { count: 4 })).toBe('4 items');

    service.setLang('ar');
    expect(service.t('card.items', { count: 1 })).toBe('عنصر واحد');
    expect(service.t('card.items', { count: 4 })).toBe('4 عنصر');
  });

  it('translates known menu ids and falls back to the API name for new ones', () => {
    service.setLang('ar');
    expect(service.menuName({ id: 'm1', name: 'Koshary' })).toBe('كشري');
    expect(service.menuName({ id: 'm99', name: 'Falafel' })).toBe('Falafel');
  });

  it('has the same placeholders in English and Arabic for every key', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
    // Arabic singular forms ("عنصر واحد") legitimately drop {count}.
    for (const key of (Object.keys(EN) as (keyof typeof EN)[]).filter((k) => !k.endsWith('.one'))) {
      expect(placeholders(AR[key]))
        .withContext(key)
        .toBe(placeholders(EN[key]));
    }
  });
});
