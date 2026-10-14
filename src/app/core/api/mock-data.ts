import { MenuItem } from '../models/menu.model';
import { Order } from '../models/order.model';

export const MOCK_MENU: readonly MenuItem[] = [
  { id: 'm1', name: 'Koshary', category: 'Mains', price: 85 },
  { id: 'm2', name: 'Chicken Shawarma Plate', category: 'Mains', price: 165 },
  { id: 'm3', name: 'Molokhia with Rice', category: 'Mains', price: 120 },
  { id: 'm4', name: 'Fattoush', category: 'Salads', price: 70 },
  { id: 'm5', name: 'Om Ali', category: 'Desserts', price: 75 },
  { id: 'm6', name: 'Fresh Mango Juice', category: 'Drinks', price: 60 },
  { id: 'm7', name: 'Turkish Coffee', category: 'Drinks', price: 40 },
];

/**
 * Same orders as db.seed.json, but created "a few minutes ago" relative to when the demo loads,
 * so the board looks alive (one late order, the rest on time) instead of everything being days old.
 */
export function createMockOrders(now = Date.now()): Order[] {
  const at = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  return [
    {
      id: '1040', number: 1040, type: 'dine-in', table: 11, phone: null, status: 'served', createdAt: at(41),
      items: [
        { menuId: 'm3', qty: 2, note: '' },
        { menuId: 'm7', qty: 1, note: 'medium sugar' },
      ],
    },
    {
      id: '1041', number: 1041, type: 'dine-in', table: 7, phone: null, status: 'preparing', createdAt: at(23),
      items: [
        { menuId: 'm2', qty: 2, note: 'no garlic sauce' },
        { menuId: 'm6', qty: 2, note: '' },
      ],
    },
    {
      id: '1042', number: 1042, type: 'dine-in', table: 2, phone: null, status: 'ready', createdAt: at(15),
      items: [
        { menuId: 'm1', qty: 1, note: 'extra dakka' },
        { menuId: 'm4', qty: 1, note: '' },
        { menuId: 'm7', qty: 2, note: '' },
      ],
    },
    {
      id: '1043', number: 1043, type: 'takeaway', table: null, phone: null, status: 'preparing', createdAt: at(9),
      items: [{ menuId: 'm1', qty: 1, note: '' }],
    },
    {
      id: '1044', number: 1044, type: 'delivery', table: null, phone: '01012345678', status: 'new', createdAt: at(3),
      items: [
        { menuId: 'm2', qty: 1, note: '' },
        { menuId: 'm5', qty: 1, note: '' },
      ],
    },
    {
      id: '1045', number: 1045, type: 'dine-in', table: 4, phone: null, status: 'new', createdAt: at(1),
      items: [
        { menuId: 'm3', qty: 1, note: '' },
        { menuId: 'm4', qty: 2, note: 'no onions' },
        { menuId: 'm6', qty: 1, note: '' },
      ],
    },
  ];
}
