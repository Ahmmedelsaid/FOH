import { Order, OrderType } from '../../../core/models/order.model';

export interface BoardFilters {
  query: string;
  type: OrderType | null;
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** What the search box means: an order number (substring) or a table number (exact). */
export interface SearchTerm {
  kind: 'order' | 'table';
  value: string;
}

/**
 * Reads the search text:
 *  - `T4`, `t-4`, `table 4`  -> table 4 (exact)
 *  - `#1043`                  -> order number containing 1043
 *  - 1-2 digits (`4`, `12`)   -> table (exact), because tables only go up to 40
 *  - 3+ digits (`104`)        -> order number containing it
 * A bare prefix (`#`, `t`, `table`) means the user is still typing, so nothing is filtered yet.
 * Matching a table by substring would make `4` match every order #104x, hence the exact match.
 */
export function parseQuery(query: string): SearchTerm | null {
  const text = query.trim().toLowerCase();
  if (!text || text === '#' || text === 't' || text === 'table') {
    return null;
  }

  const order = /^#\s*(\d+)$/.exec(text);
  if (order) {
    return { kind: 'order', value: order[1] };
  }

  const table = /^(?:t|table)[\s-]*(\d+)$/.exec(text);
  if (table) {
    return { kind: 'table', value: String(Number(table[1])) };
  }

  if (/^\d{1,2}$/.test(text)) {
    return { kind: 'table', value: String(Number(text)) };
  }

  return { kind: 'order', value: text.replace(/^#/, '') };
}

export function filterOrders(orders: readonly Order[], { query, type }: BoardFilters): Order[] {
  const term = parseQuery(query);
  return orders.filter((order) => {
    if (type && order.type !== type) {
      return false;
    }
    if (!term) {
      return true;
    }
    return term.kind === 'table'
      ? order.table !== null && String(order.table) === term.value
      : String(order.number).includes(term.value);
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
