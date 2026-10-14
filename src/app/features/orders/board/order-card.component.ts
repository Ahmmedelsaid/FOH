import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { MenuItem } from '../../../core/models/menu.model';
import { Order } from '../../../core/models/order.model';
import { calculatePrice, itemsSubtotal } from '../../../core/pricing/pricing';
import { formatElapsed, isLate } from './elapsed';
import { parseQuery, splitMatch } from './order-filters';

/** How many item lines a card shows before collapsing the rest into "+N more". */
const PREVIEW_LINES = 3;

@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.scss',
})
export class OrderCardComponent {
  protected readonly i18n = inject(I18nService);

  readonly order = input.required<Order>();
  readonly menu = input.required<ReadonlyMap<string, MenuItem>>();
  readonly now = input.required<number>();
  readonly pending = input(false);
  /** The raw search text; the part of the number or table that matches it is highlighted. */
  readonly query = input('');

  readonly advance = output<Order>();

  protected readonly place = computed(() => {
    const { type, table } = this.order();
    return type === 'dine-in' && table !== null ? `T-${table}` : this.i18n.t(`type.${type}`);
  });

  private readonly term = computed(() => parseQuery(this.query()));

  protected readonly numberParts = computed(() => {
    const text = String(this.order().number);
    const term = this.term();
    return splitMatch(text, term?.kind === 'order' ? term.value : '');
  });

  /** Only dine-in cards show a table number (T-7), so only those can highlight a table match. */
  protected readonly tableParts = computed(() => {
    const { type, table } = this.order();
    if (type !== 'dine-in' || table === null) {
      return null;
    }
    const term = this.term();
    return splitMatch(String(table), term?.kind === 'table' ? term.value : '');
  });

  protected readonly placeLabel = computed(() => {
    const { type, table } = this.order();
    return type === 'dine-in' && table !== null
      ? this.i18n.t('card.table', { number: table })
      : this.i18n.t(`type.${type}`);
  });

  protected readonly itemCount = computed(() => this.order().items.reduce((sum, item) => sum + item.qty, 0));

  protected readonly lines = computed(() =>
    this.order().items.map((item) => {
      const menuItem = this.menu().get(item.menuId);
      return {
        qty: item.qty,
        name: menuItem ? this.i18n.menuName(menuItem) : this.i18n.t('common.unknownItem'),
        note: item.note,
      };
    }),
  );

  protected readonly previewLines = computed(() => this.lines().slice(0, PREVIEW_LINES));
  protected readonly hiddenLines = computed(() => Math.max(0, this.lines().length - PREVIEW_LINES));

  protected readonly total = computed(() => {
    const { items, type } = this.order();
    return calculatePrice(itemsSubtotal(items, this.menu()), type).total;
  });

  private readonly elapsedMs = computed(() => this.now() - Date.parse(this.order().createdAt));

  protected readonly late = computed(() => isLate(this.order(), this.elapsedMs()));

  protected readonly elapsedLabel = computed(() =>
    this.order().status === 'served'
      ? this.i18n.t('card.done')
      : formatElapsed(this.elapsedMs(), (d, h) => this.i18n.t('elapsed.days', { d, h })),
  );

  /** Translation key of the action that moves the order forward, or null once it is served. */
  protected readonly actionKey = computed(() => {
    const status = this.order().status;
    return status === 'served' ? null : `action.${status}`;
  });
}
