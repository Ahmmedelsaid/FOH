import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MenuItem } from '../models/menu.model';
import { Order } from '../models/order.model';
import { mockApiInterceptor, resetMockApi } from './mock-api.interceptor';

const API = 'http://localhost:3000';

describe('mockApiInterceptor (demo build)', () => {
  let http: HttpClient;

  beforeEach(() => {
    resetMockApi();
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([mockApiInterceptor]))] });
    http = TestBed.inject(HttpClient);
  });

  it('serves the menu and the starting orders', async () => {
    expect((await firstValueFrom(http.get<MenuItem[]>(`${API}/menu`))).length).toBe(7);
    expect((await firstValueFrom(http.get<Order[]>(`${API}/orders`))).length).toBe(6);
  });

  it('starts with recent orders so the demo is not all "late"', async () => {
    const orders = await firstValueFrom(http.get<Order[]>(`${API}/orders`));
    const oldest = Math.min(...orders.map((order) => Date.parse(order.createdAt)));
    expect(Date.now() - oldest).toBeLessThan(2 * 60 * 60 * 1000);
  });

  it('applies a PATCH and returns the updated order', async () => {
    const updated = await firstValueFrom(http.patch<Order>(`${API}/orders/1044`, { status: 'preparing' }));
    expect(updated.status).toBe('preparing');
    expect((await firstValueFrom(http.get<Order>(`${API}/orders/1044`))).status).toBe('preparing');
  });

  it('stores a POSTed order', async () => {
    const order = { id: '1046', number: 1046, status: 'new' } as Order;
    await firstValueFrom(http.post(`${API}/orders`, order));
    expect((await firstValueFrom(http.get<Order[]>(`${API}/orders`))).length).toBe(7);
  });

  it('answers 404 for an order that does not exist', async () => {
    const error = await firstValueFrom(http.get(`${API}/orders/9999`)).catch((e: unknown) => e);
    expect(error instanceof HttpErrorResponse && error.status).toBe(404);
  });

  it('does not let callers change the fake database through a returned object', async () => {
    const first = await firstValueFrom(http.get<Order[]>(`${API}/orders`));
    first[0].status = 'new';
    const second = await firstValueFrom(http.get<Order[]>(`${API}/orders`));
    expect(second[0].status).toBe('served');
  });
});
