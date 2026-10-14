import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, forkJoin, map, of, startWith, switchMap } from 'rxjs';
import { MenuApi } from '../../../core/api/menu-api.service';
import { OrdersApi } from '../../../core/api/orders-api.service';
import { MenuItem } from '../../../core/models/menu.model';
import { STATUS_LABELS, TYPE_LABELS } from '../../../core/models/order-labels';
import { Order } from '../../../core/models/order.model';
import { PriceBreakdown, calculatePrice, itemsSubtotal, lineTotal } from '../../../core/pricing/pricing';

interface DetailLine {
  name: string;
  qty: number;
  note: string;
  lineTotal: number;
}

type DetailsState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'loaded'; order: Order; lines: DetailLine[]; price: PriceBreakdown };

function buildDetails(order: Order, menu: MenuItem[]): DetailsState {
  const menuById = new Map(menu.map((item) => [item.id, item]));
  const lines = order.items.map((item) => ({
    name: menuById.get(item.menuId)?.name ?? `Unknown item (${item.menuId})`,
    qty: item.qty,
    note: item.note,
    lineTotal: lineTotal(item, menuById),
  }));
  return {
    kind: 'loaded',
    order,
    lines,
    price: calculatePrice(itemsSubtotal(order.items, menuById), order.type),
  };
}

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.scss',
})
export class OrderDetailsComponent {
  private readonly ordersApi = inject(OrdersApi);
  private readonly menuApi = inject(MenuApi);
  private readonly reload$ = new Subject<void>();

  /** Bound from the :id route param (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly typeLabels = TYPE_LABELS;

  protected readonly state = toSignal(
    combineLatest([toObservable(this.id), this.reload$.pipe(startWith(undefined))]).pipe(
      switchMap(([id]) =>
        forkJoin([this.ordersApi.get(id), this.menuApi.menu$]).pipe(
          map(([order, menu]) => buildDetails(order, menu)),
          startWith<DetailsState>({ kind: 'loading' }),
          catchError((error: unknown) =>
            of<DetailsState>(
              error instanceof HttpErrorResponse && error.status === 404
                ? { kind: 'not-found' }
                : { kind: 'error' },
            ),
          ),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as DetailsState },
  );

  protected retry(): void {
    this.reload$.next();
  }
}
