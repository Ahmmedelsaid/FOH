import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from '../../../core/models/menu.model';
import { TYPE_LABELS } from '../../../core/models/order-labels';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { calculatePrice, itemsSubtotal } from '../../../core/pricing/pricing';
import { formatElapsed, isLate } from './elapsed';

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  new: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Mark served',
};

/** How many item lines a card shows before collapsing the rest into "+N more". */
const PREVIEW_LINES = 3;

@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.scss',
})
export class OrderCardComponent {
  readonly order = input.required<Order>();
  readonly menu = input.required<ReadonlyMap<string, MenuItem>>();
  readonly now = input.required<number>();
  readonly pending = input(false);

  readonly advance = output<Order>();

  protected readonly place = computed(() => {
    const { type, table } = this.order();
    return type === 'dine-in' && table !== null ? `T-${table}` : TYPE_LABELS[type];
  });

  protected readonly placeLabel = computed(() => {
    const { type, table } = this.order();
    return type === 'dine-in' && table !== null ? `Table ${table}` : TYPE_LABELS[type];
  });

  protected readonly itemCount = computed(() => this.order().items.reduce((sum, item) => sum + item.qty, 0));

  protected readonly lines = computed(() =>
    this.order().items.map((item) => ({
      qty: item.qty,
      name: this.menu().get(item.menuId)?.name ?? 'Unknown item',
      note: item.note,
    })),
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
    this.order().status === 'served' ? 'done' : formatElapsed(this.elapsedMs()),
  );

  protected readonly actionLabel = computed(() => ACTION_LABELS[this.order().status] ?? null);
}
