import { Order } from '../../../core/models/order.model';

export const LATE_AFTER_MS = 20 * 60 * 1000;

const pad = (n: number): string => String(n).padStart(2, '0');

/** mm:ss, h:mm:ss after an hour, and Nd Nh after a day (so very old orders stay readable). */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Late = not Ready yet (so New or Preparing) and older than 20 minutes. */
export function isLate(order: Pick<Order, 'status'>, elapsedMs: number): boolean {
  return (order.status === 'new' || order.status === 'preparing') && elapsedMs > LATE_AFTER_MS;
}
