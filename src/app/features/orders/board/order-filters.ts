import { Order, OrderType } from '../../../core/models/order.model';

export interface BoardFilters {
  query: string;
  type: OrderType | null;
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** Trims the query and drops a leading "#", so "#1043" and "1043" search the same way. */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/^#/, '');
}

/** Matches the query against the order number or the table number (substring match). */
export function filterOrders(orders: readonly Order[], { query, type }: BoardFilters): Order[] {
  const needle = normalizeQuery(query);
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

/** Splits `text` around the first occurrence of `needle`, so the match can be highlighted. */
export function splitMatch(text: string, needle: string): TextPart[] {
  const start = needle ? text.indexOf(needle) : -1;
  if (start < 0) {
    return [{ text, match: false }];
  }
  const end = start + needle.length;
  return [
    { text: text.slice(0, start), match: false },
    { text: text.slice(start, end), match: true },
    { text: text.slice(end), match: false },
  ].filter((part) => part.text !== '');
}
