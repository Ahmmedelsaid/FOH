import { MenuItem } from '../models/menu.model';
import { OrderItem, OrderType } from '../models/order.model';

export const SERVICE_RATE = 0.12;
export const VAT_RATE = 0.14;

export interface PriceBreakdown {
  subtotal: number;
  service: number;
  vat: number;
  total: number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/** Service applies to dine-in only; VAT applies to subtotal + service. */
export function calculatePrice(subtotal: number, type: OrderType): PriceBreakdown {
  const service = type === 'dine-in' ? round2(subtotal * SERVICE_RATE) : 0;
  const vat = round2((subtotal + service) * VAT_RATE);
  return { subtotal, service, vat, total: round2(subtotal + service + vat) };
}

export function lineTotal(item: OrderItem, menu: ReadonlyMap<string, MenuItem>): number {
  return round2((menu.get(item.menuId)?.price ?? 0) * item.qty);
}

export function itemsSubtotal(items: readonly OrderItem[], menu: ReadonlyMap<string, MenuItem>): number {
  return round2(items.reduce((sum, item) => sum + lineTotal(item, menu), 0));
}
