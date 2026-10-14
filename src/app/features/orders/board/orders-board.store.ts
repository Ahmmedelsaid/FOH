import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  finalize,
  forkJoin,
  fromEvent,
  interval,
  map,
  merge,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { MenuApi } from '../../../core/api/menu-api.service';
import { OrdersApi } from '../../../core/api/orders-api.service';
import { MenuItem } from '../../../core/models/menu.model';
import { Order, OrderStatus, nextStatus } from '../../../core/models/order.model';

const POLL_INTERVAL_MS = 15_000;

export type LoadState = 'loading' | 'loaded' | 'error';

/**
 * State for the board page. Provided by the board component (not root), so the polling
 * subscriptions are tied to the component and stop when the user leaves the page.
 */
@Injectable()
export class OrdersBoardStore {
  private readonly ordersApi = inject(OrdersApi);
  private readonly menuApi = inject(MenuApi);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refreshRequests = new Subject<void>();
  /** Bumped whenever a status change starts or ends; lets us discard stale poll responses. */
  private mutationEpoch = 0;

  readonly orders = signal<Order[]>([]);
  readonly menu = signal<ReadonlyMap<string, MenuItem>>(new Map());
  readonly loadState = signal<LoadState>('loading');
  /** True when a background refresh failed but we still have data to show. */
  readonly refreshFailed = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());
  /** Timestamp of the last successful refresh. */
  readonly lastUpdated = signal<number | null>(null);
  /** Shared clock for all cards, ticking every second. */
  readonly now = signal(Date.now());

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
    this.startPolling();
  }

  refresh(): void {
    if (this.loadState() === 'error') {
      this.loadState.set('loading');
    }
    this.refreshRequests.next();
  }

  dismissError(): void {
    this.actionError.set(null);
  }

  /** Optimistic: update the UI first, then PATCH. On failure roll back and tell the user. */
  advance(order: Order): void {
    const target = nextStatus(order.status);
    if (!target || this.pendingIds().has(order.id)) {
      return;
    }
    const previous = order.status;

    this.actionError.set(null);
    this.mutationEpoch++;
    this.setStatus(order.id, target);
    this.setPending(order.id, true);

    // Not cancelled on destroy: the request is finite, and the change should still reach the server.
    this.ordersApi
      .updateStatus(order.id, target)
      .pipe(
        finalize(() => {
          this.mutationEpoch++;
          this.setPending(order.id, false);
        }),
      )
      .subscribe({
        error: () => {
          this.setStatus(order.id, previous);
          this.actionError.set(
            `Could not move order #${order.number} to "${target}". The change was reverted, please try again.`,
          );
        },
      });
  }

  /**
   * Poll every 15s. exhaustMap ignores ticks while a request is in flight, so requests never overlap.
   * Polling pauses while the tab is hidden and fires immediately when it becomes visible again.
   */
  private startPolling(): void {
    const visible$ = fromEvent(this.document, 'visibilitychange').pipe(
      map(() => !this.document.hidden),
      startWith(!this.document.hidden),
      distinctUntilChanged(),
    );
    const ticks$ = visible$.pipe(switchMap((visible) => (visible ? timer(0, POLL_INTERVAL_MS) : EMPTY)));

    merge(ticks$, this.refreshRequests)
      .pipe(
        exhaustMap(() => this.fetch()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private fetch(): Observable<unknown> {
    const epochAtStart = this.mutationEpoch;
    // menu$ is cached after the first success, so later polls only hit /orders.
    return forkJoin([this.ordersApi.list(), this.menuApi.menu$]).pipe(
      tap(([orders, menu]) => {
        this.menu.set(new Map(menu.map((item) => [item.id, item])));
        // If a status change happened while this request was in flight, the response may be stale.
        if (epochAtStart === this.mutationEpoch) {
          this.orders.set(orders);
        }
        this.loadState.set('loaded');
        this.refreshFailed.set(false);
        this.lastUpdated.set(Date.now());
      }),
      catchError(() => {
        if (this.loadState() === 'loaded') {
          this.refreshFailed.set(true);
        } else {
          this.loadState.set('error');
        }
        return EMPTY;
      }),
    );
  }

  private setStatus(id: string, status: OrderStatus): void {
    this.orders.update((orders) => orders.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  private setPending(id: string, pending: boolean): void {
    this.pendingIds.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
