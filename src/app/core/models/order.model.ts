export const ORDER_STATUSES = ['new', 'preparing', 'ready', 'served'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export interface OrderItem {
  menuId: string;
  qty: number;
  note: string;
}

export interface Order {
  id: string;
  number: number;
  type: OrderType;
  table: number | null;
  phone: string | null;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

export type NewOrder = Omit<Order, 'id' | 'number' | 'status' | 'createdAt'>;

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const next = ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1];
  return next ?? null;
}

export function isOrderType(value: unknown): value is OrderType {
  return ORDER_TYPES.includes(value as OrderType);
}
