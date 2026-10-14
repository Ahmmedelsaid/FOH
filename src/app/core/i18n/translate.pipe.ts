import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService, TranslateParams } from './i18n.service';

/**
 * `{{ 'board.title' | t }}`. The pipe is impure on purpose: a pure pipe would only re-run when its
 * inputs change, not when the language signal does. The signal read inside `t()` is what makes
 * OnPush components refresh on a language switch.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: TranslateParams): string {
    return this.i18n.t(key, params);
  }
}
