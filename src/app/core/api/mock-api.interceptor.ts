import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of, switchMap, throwError, timer } from 'rxjs';
import { Order } from '../models/order.model';
import { API_URL } from './api-url.token';
import { MOCK_MENU, createMockOrders } from './mock-data';

/** A little latency, so the loading states are visible like they would be with a real server. */
const LATENCY_MS = 250;

let orders: Order[] = createMockOrders();

/** Back to the starting data (used by tests). */
export function resetMockApi(): void {
  orders = createMockOrders();
}

/**
 * Fakes the json-server API in memory for the static "demo" build:
 * GET /menu, GET/POST /orders and GET/PATCH /orders/:id. Changes live until the page is reloaded.
 */
export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_URL);
  if (!request.url.startsWith(base)) {
    return next(request);
  }
  return later(() => handle(request, request.url.slice(base.length)));
};

function handle(request: HttpRequest<unknown>, path: string): Observable<HttpResponse<unknown>> {
  const orderId = /^\/orders\/([^/]+)$/.exec(path)?.[1];

  if (request.method === 'GET' && path === '/menu') {
    return ok(MOCK_MENU);
  }
  if (request.method === 'GET' && path === '/orders') {
    return ok(orders);
  }
  if (request.method === 'POST' && path === '/orders') {
    const created = { ...(request.body as Order) };
    orders = [...orders, created];
    return ok(created, 201);
  }
  if (orderId !== undefined) {
    const found = orders.find((order) => order.id === decodeURIComponent(orderId));
    if (!found) {
      return notFound(request);
    }
    if (request.method === 'GET') {
      return ok(found);
    }
    if (request.method === 'PATCH') {
      const updated = { ...found, ...(request.body as Partial<Order>) };
      orders = orders.map((order) => (order.id === found.id ? updated : order));
      return ok(updated);
    }
  }
  return notFound(request);
}

/** Responses are copies, so the app can never change the fake database by accident. */
function ok(body: unknown, status = 200): Observable<HttpResponse<unknown>> {
  return of(new HttpResponse({ status, body: structuredClone(body) }));
}

function notFound(request: HttpRequest<unknown>): Observable<never> {
  return throwError(
    () => new HttpErrorResponse({ status: 404, statusText: 'Not Found', url: request.url }),
  );
}

function later<T>(source: () => Observable<T>): Observable<T> {
  return timer(LATENCY_MS).pipe(switchMap(source));
}
