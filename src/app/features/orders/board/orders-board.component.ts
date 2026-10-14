import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ORDER_STATUSES, ORDER_TYPES, OrderType, isOrderType } from '../../../core/models/order.model';
import { isLate } from './elapsed';
import { BoardFilters, filterOrders } from './order-filters';
import { OrderCardComponent } from './order-card.component';
import { OrdersBoardStore } from './orders-board.store';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-orders-board',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, OrderCardComponent],
  providers: [OrdersBoardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-board.component.html',
  styleUrl: './orders-board.component.scss',
})
export class OrdersBoardComponent {
  protected readonly store = inject(OrdersBoardStore);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly types = ORDER_TYPES;

  /** The URL is the single source of truth for filters, so refresh and shared links keep the view. */
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly filters = computed<BoardFilters>(() => {
    const params = this.queryParams();
    const type = params.get('type');
    return { query: (params.get('q') ?? '').trim(), type: isOrderType(type) ? type : null };
  });

  /** Number of the order that was just created in the form, passed through router state. */
  protected readonly createdOrder = signal<number | null>(this.consumeCreatedOrder());

  protected readonly search = new FormControl(this.filters().query, { nonNullable: true });
  /** What is typed right now (before the debounce), used to show the clear button instantly. */
  protected readonly searchText = signal(this.filters().query);
  protected readonly isFiltered = computed(() => !!this.filters().query || !!this.filters().type);

  /** Last query we wrote to the URL, so we can tell our own navigations from back/forward ones. */
  private lastPushedQuery = this.filters().query;

  protected readonly columns = computed(() => {
    const visible = filterOrders(this.store.orders(), this.filters());
    return ORDER_STATUSES.map((status) => ({
      status,
      orders: visible
        .filter((order) => order.status === status)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    }));
  });

  protected readonly lateCount = computed(() => {
    const now = this.store.now();
    return this.store.orders().filter((order) => isLate(order, now - Date.parse(order.createdAt))).length;
  });

  protected readonly visibleCount = computed(() =>
    this.columns().reduce((sum, column) => sum + column.orders.length, 0),
  );

  constructor() {
    this.search.valueChanges
      .pipe(
        tap((value) => this.searchText.set(value)),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
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
        this.searchText.set(query);
      }
    });
  }

  protected setType(type: OrderType | null): void {
    this.updateParams({ type });
  }

  /** Clears the search immediately (no debounce) and keeps the type filter. */
  protected clearSearch(): void {
    this.search.setValue('', { emitEvent: false });
    this.searchText.set('');
    this.lastPushedQuery = '';
    this.updateParams({ q: null });
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.searchText.set('');
    this.lastPushedQuery = '';
    this.updateParams({ q: null, type: null });
  }

  /** Reads the one-time "order created" message and clears it so a page refresh doesn't show it again. */
  private consumeCreatedOrder(): number | null {
    const history = inject(DOCUMENT).defaultView?.history;
    const created: unknown = history?.state?.createdOrder;
    if (typeof created !== 'number') {
      return null;
    }
    history?.replaceState({ ...history.state, createdOrder: undefined }, '');
    return created;
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
