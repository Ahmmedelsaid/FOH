import { MenuItem } from '../models/menu.model';
import { calculatePrice, itemsSubtotal } from './pricing';

describe('pricing', () => {
  it('adds 12% service and 14% VAT on subtotal + service for dine-in (#1041)', () => {
    expect(calculatePrice(450, 'dine-in')).toEqual({ subtotal: 450, service: 54, vat: 70.56, total: 574.56 });
  });

  it('skips service for delivery (#1044)', () => {
    expect(calculatePrice(240, 'delivery')).toEqual({ subtotal: 240, service: 0, vat: 33.6, total: 273.6 });
  });

  it('skips service for takeaway', () => {
    expect(calculatePrice(100, 'takeaway').service).toBe(0);
  });

  it('is zero for an empty order', () => {
    expect(calculatePrice(0, 'dine-in').total).toBe(0);
  });

  describe('itemsSubtotal', () => {
    const menu = new Map<string, MenuItem>([
      ['m2', { id: 'm2', name: 'Shawarma', category: 'Mains', price: 165 }],
      ['m6', { id: 'm6', name: 'Juice', category: 'Drinks', price: 60 }],
    ]);

    it('sums price x qty across lines (#1041 = 450)', () => {
      const items = [
        { menuId: 'm2', qty: 2, note: '' },
        { menuId: 'm6', qty: 2, note: '' },
      ];
      expect(itemsSubtotal(items, menu)).toBe(450);
    });

    it('treats unknown menu ids as free instead of throwing', () => {
      expect(itemsSubtotal([{ menuId: 'gone', qty: 3, note: '' }], menu)).toBe(0);
    });
  });
});
