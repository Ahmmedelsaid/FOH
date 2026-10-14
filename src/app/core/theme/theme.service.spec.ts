import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.removeItem('theme'));
  afterEach(() => localStorage.removeItem('theme'));

  it('toggles between light and dark, updates <html> and remembers the choice', () => {
    const service = TestBed.inject(ThemeService);
    const start = service.theme();

    service.toggle();
    TestBed.flushEffects();

    const expected = start === 'dark' ? 'light' : 'dark';
    expect(service.theme()).toBe(expected);
    expect(document.documentElement.dataset['theme']).toBe(expected);
    expect(localStorage.getItem('theme')).toBe(expected);
  });

  it('is dark by default', () => {
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });

  it('uses the saved choice over the default', () => {
    localStorage.setItem('theme', 'light');
    expect(TestBed.inject(ThemeService).theme()).toBe('light');
  });
});
