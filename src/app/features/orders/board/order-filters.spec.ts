import { Order } from '../../../core/models/order.model';
import { LATE_AFTER_MS, formatElapsed, isLate } from './elapsed';
import { filterOrders, parseQuery, splitMatch } from './order-filters';

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
    expect(formatElapsed(((17 * 24) + 4) * 3_600_000)).toBe('17d 4h');
  });

  it('marks New/Preparing orders late after 20 minutes, never Ready/Served', () => {
    expect(isLate({ status: 'preparing' }, LATE_AFTER_MS + 1)).toBeTrue();
    expect(isLate({ status: 'new' }, LATE_AFTER_MS)).toBeFalse();
    expect(isLate({ status: 'ready' }, LATE_AFTER_MS * 5)).toBeFalse();
    expect(isLate({ status: 'served' }, LATE_AFTER_MS * 5)).toBeFalse();
  });
});

describe('splitMatch', () => {
  it('splits around the first match', () => {
    expect(splitMatch('1043', '04')).toEqual([
      { text: '1', match: false },
      { text: '04', match: true },
      { text: '3', match: false },
    ]);
  });

  it('drops empty parts at the edges', () => {
    expect(splitMatch('1043', '1043')).toEqual([{ text: '1043', match: true }]);
    expect(splitMatch('1043', '10')).toEqual([
      { text: '10', match: true },
      { text: '43', match: false },
    ]);
  });

  it('returns the text untouched when there is no query or no match', () => {
    expect(splitMatch('1043', '')).toEqual([{ text: '1043', match: false }]);
    expect(splitMatch('1043', '99')).toEqual([{ text: '1043', match: false }]);
  });
});

describe('parseQuery', () => {
  it('reads table syntaxes as an exact table', () => {
    for (const text of ['T4', 't-4', 'table 4', 'Table4', '4', '04']) {
      expect(parseQuery(text)).withContext(text).toEqual({ kind: 'table', value: '4' });
    }
  });

  it('reads # and 3+ digits as an order number', () => {
    expect(parseQuery('#1043')).toEqual({ kind: 'order', value: '1043' });
    expect(parseQuery('# 104')).toEqual({ kind: 'order', value: '104' });
    expect(parseQuery('104')).toEqual({ kind: 'order', value: '104' });
  });

  it('does not filter while only a prefix is typed', () => {
    for (const text of ['', '  ', '#', 't', 'table']) {
      expect(parseQuery(text)).withContext(text).toBeNull();
    }
  });
});

describe('filterOrders search rules', () => {
  const orders = ['1040:11', '1041:7', '1042:2', '1043:', '1044:', '1045:4'].map((entry) => {
    const [number, table] = entry.split(':');
    return order({
      id: number,
      number: Number(number),
      table: table ? Number(table) : null,
      type: table ? 'dine-in' : 'takeaway',
    });
  });
  const ids = (query: string) => filterOrders(orders, { query, type: null }).map((o) => o.id);

  it('a short number finds that table only, not every order #104x', () => {
    expect(ids('4')).toEqual(['1045']);
    expect(ids('1')).toEqual([]);
    expect(ids('11')).toEqual(['1040']);
  });

  it('T7 and table 7 find table 7', () => {
    expect(ids('T7')).toEqual(['1041']);
    expect(ids('table 7')).toEqual(['1041']);
  });

  it('longer numbers search order numbers, never tables', () => {
    expect(ids('1043')).toEqual(['1043']);
    expect(ids('104')).toHaveSize(6);
    expect(ids('#1045')).toEqual(['1045']);
  });
});
