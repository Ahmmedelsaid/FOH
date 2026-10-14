import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { STATUS_LABELS, TYPE_LABELS } from '../../../core/models/order-labels';
import { ORDER_STATUSES, ORDER_TYPES, OrderType, isOrderType } from '../../../core/models/order.model';
import { BoardFilters, filterOrders } from './order-filters';
import { OrderCardComponent } from './order-card.component';
import { OrdersBoardStore } from './orders-board.store';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-orders-board',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, OrderCardComponent],
  providers: [OrdersBoardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-board.component.html',
  styleUrl: './orders-board.component.scss',
})
export class OrdersBoardComponent {
  protected readonly store = inject(OrdersBoardStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly types = ORDER_TYPES;
  protected readonly typeLabels = TYPE_LABELS;

  /** The URL is the single source of truth for filters, so refresh and shared links keep the view. */
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filters = computed<BoardFilters>(() => {
    const params = this.queryParams();
    const type = params.get('type');
    return { query: (params.get('q') ?? '').trim(), type: isOrderType(type) ? type : null };
  });

  protected readonly hasFilters = computed(() => !!this.filters().query || !!this.filters().type);

  protected readonly search = new FormControl(this.filters().query, { nonNullable: true });
  /** Last query we wrote to the URL, so we can tell our own navigations from back/forward ones. */
  private lastPushedQuery = this.filters().query;

  protected readonly columns = computed(() => {
    const visible = filterOrders(this.store.orders(), this.filters());
    return ORDER_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      orders: visible
        .filter((order) => order.status === status)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    }));
  });

  protected readonly visibleCount = computed(() =>
    this.columns().reduce((sum, column) => sum + column.orders.length, 0),
  );

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        const query = value.trim();
        this.lastPushedQuery = query;
        this.updateParams({ q: query || null });
      });

    // Back/forward navigation changes the URL without the user typing: mirror it into the input.
    effect(() => {
      const query = this.filters().query;
      if (query !== this.lastPushedQuery) {
        this.lastPushedQuery = query;
        this.search.setValue(query, { emitEvent: false });
      }
    });
  }

  protected setType(type: OrderType | null): void {
    this.updateParams({ type });
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.lastPushedQuery = '';
    this.updateParams({ q: null, type: null });
  }

  private updateParams(params: { q?: string | null; type?: OrderType | null }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
