import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { NewOrder, Order, OrderStatus } from '../models/order.model';
import { API_URL } from './api-url.token';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/orders`;

  list(): Observable<Order[]> {
    return this.http.get<Order[]>(this.url);
  }

  get(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${encodeURIComponent(id)}`);
  }

  updateStatus(id: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.url}/${encodeURIComponent(id)}`, { status });
  }

  /**
   * json-server has no sequences, so the next number is max(existing) + 1.
   * This can race with another client; a real backend would assign it.
   */
  create(draft: NewOrder): Observable<Order> {
    return this.list().pipe(
      map((orders) => orders.reduce((max, o) => Math.max(max, o.number), 1000) + 1),
      switchMap((number) => {
        const order: Order = {
          ...draft,
          id: String(number),
          number,
          status: 'new',
          createdAt: new Date().toISOString(),
        };
        return this.http.post<Order>(this.url, order);
      }),
    );
  }
}
