import { Order, OrderType } from '../../../core/models/order.model';

export interface BoardFilters {
  query: string;
  type: OrderType | null;
}

/** Matches the query against the order number or the table number (substring match). */
export function filterOrders(orders: readonly Order[], { query, type }: BoardFilters): Order[] {
  const needle = query.trim().replace(/^#/, '');
  return orders.filter((order) => {
    if (type && order.type !== type) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return (
      String(order.number).includes(needle) || (order.table !== null && String(order.table).includes(needle))
    );
  });
}
