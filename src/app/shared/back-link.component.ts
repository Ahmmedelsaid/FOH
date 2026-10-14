import { DOCUMENT, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/translate.pipe';

/**
 * "Back to board" that behaves like the browser's back button when the user came from inside the
 * app, so the board keeps its search and filters (they live in the URL). On a direct visit there
 * is nothing to go back to, so it navigates to the board instead.
 */
@Component({
  selector: 'app-back-link',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a class="back-link" href="/orders" (click)="back($event)">{{ 'common.back' | t }}</a>`,
})
export class BackLinkComponent {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  protected back(event: MouseEvent): void {
    // Let "open in new tab" clicks use the real href.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();

    // The router stamps each history entry with a navigationId; > 1 means an earlier in-app page exists.
    const navigationId: unknown = this.document.defaultView?.history.state?.navigationId;
    if (typeof navigationId === 'number' && navigationId > 1) {
      this.location.back();
    } else {
      void this.router.navigate(['/orders']);
    }
  }
}
