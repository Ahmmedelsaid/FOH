import { Order } from '../../../core/models/order.model';
import { LATE_AFTER_MS, formatElapsed, isLate } from './elapsed';
import { filterOrders } from './order-filters';

const order = (overrides: Partial<Order>): Order => ({
  id: '1',
  number: 1041,
  type: 'dine-in',
  table: 7,
  phone: null,
  status: 'new',
  createdAt: '2026-09-27T09:22:00.000Z',
  items: [],
  ...overrides,
});

describe('filterOrders', () => {
  const orders = [
    order({ id: '1', number: 1041, table: 7 }),
    order({ id: '2', number: 1043, type: 'takeaway', table: null }),
    order({ id: '3', number: 1044, type: 'delivery', table: null, phone: '01012345678' }),
  ];

  it('returns everything without filters', () => {
    expect(filterOrders(orders, { query: '', type: null }).length).toBe(3);
  });

  it('matches order number and table number', () => {
    expect(filterOrders(orders, { query: '1043', type: null }).map((o) => o.id)).toEqual(['2']);
    expect(filterOrders(orders, { query: '#1043', type: null }).map((o) => o.id)).toEqual(['2']);
    expect(filterOrders(orders, { query: '7', type: null }).map((o) => o.id)).toEqual(['1']);
  });

  it('filters by type and combines with search', () => {
    expect(filterOrders(orders, { query: '', type: 'delivery' }).map((o) => o.id)).toEqual(['3']);
    expect(filterOrders(orders, { query: '1041', type: 'delivery' })).toEqual([]);
  });
});

describe('elapsed', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(134_000)).toBe('02:14');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-5000)).toBe('00:00');
  });

  it('marks New/Preparing orders late after 20 minutes, never Ready/Served', () => {
    expect(isLate({ status: 'preparing' }, LATE_AFTER_MS + 1)).toBeTrue();
    expect(isLate({ status: 'new' }, LATE_AFTER_MS)).toBeFalse();
    expect(isLate({ status: 'ready' }, LATE_AFTER_MS * 5)).toBeFalse();
    expect(isLate({ status: 'served' }, LATE_AFTER_MS * 5)).toBeFalse();
  });
});
