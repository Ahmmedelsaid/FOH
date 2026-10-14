import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuItem } from '../../../core/models/menu.model';
import { Order } from '../../../core/models/order.model';
import { OrderCardComponent } from './order-card.component';

const CREATED = Date.parse('2026-09-27T09:22:00.000Z');

const menu = new Map<string, MenuItem>([
  ['m2', { id: 'm2', name: 'Shawarma', category: 'Mains', price: 165 }],
  ['m6', { id: 'm6', name: 'Juice', category: 'Drinks', price: 60 }],
]);

const order: Order = {
  id: '1041',
  number: 1041,
  type: 'dine-in',
  table: 7,
  phone: null,
  status: 'preparing',
  createdAt: new Date(CREATED).toISOString(),
  items: [
    { menuId: 'm2', qty: 2, note: '' },
    { menuId: 'm6', qty: 2, note: '' },
  ],
};

describe('OrderCardComponent', () => {
  let fixture: ComponentFixture<OrderCardComponent>;

  const render = (overrides: { order?: Order; now?: number; pending?: boolean } = {}) => {
    fixture.componentRef.setInput('order', overrides.order ?? order);
    fixture.componentRef.setInput('menu', menu);
    fixture.componentRef.setInput('now', overrides.now ?? CREATED + 134_000);
    fixture.componentRef.setInput('pending', overrides.pending ?? false);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderCardComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(OrderCardComponent);
  });

  it('shows number, table, item count, grand total and elapsed time', () => {
    const text = render().textContent ?? '';
    expect(text).toContain('#1041');
    expect(text).toContain('T-7');
    expect(text).toContain('4 items');
    expect(text).toContain('EGP 574.56');
    expect(text).toContain('02:14');
    expect(text).not.toContain('Late');
  });

  it('is marked late after 20 minutes', () => {
    const element = render({ now: CREATED + 21 * 60_000 });
    expect(element.querySelector('.card')?.classList).toContain('late');
    expect(element.textContent).toContain('Late');
  });

  it('emits the order when the action is clicked and disables it while pending', () => {
    const emitted: Order[] = [];
    fixture.componentInstance.advance.subscribe((o) => emitted.push(o));

    const button = render().querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Mark ready');
    button.click();
    expect(emitted).toEqual([order]);

    expect((render({ pending: true }).querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('has no action and shows "done" once served', () => {
    const element = render({ order: { ...order, status: 'served' } });
    expect(element.querySelector('button')).toBeNull();
    expect(element.textContent).toContain('done');
  });
});
