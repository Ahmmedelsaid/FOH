import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuItem } from '../../../core/models/menu.model';
import { OrderFormComponent } from './order-form.component';

const MENU: MenuItem[] = [
  { id: 'm1', name: 'Koshary', category: 'Mains', price: 85 },
  { id: 'm6', name: 'Fresh Mango Juice', category: 'Drinks', price: 60 },
];

describe('OrderFormComponent quick add', () => {
  let fixture: ComponentFixture<OrderFormComponent>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const chip = (index: number) => element.querySelectorAll<HTMLButtonElement>('.chip')[index];
  const rows = () => element.querySelectorAll('.row');
  const qtyInput = (row = 0) => element.querySelectorAll<HTMLInputElement>('.row .stepper input')[row];
  const selectValue = (row = 0) => element.querySelectorAll<HTMLSelectElement>('.row select')[row].value;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrderFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrderFormComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/menu').flush(MENU);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('fills the empty starting row first instead of adding a second one', () => {
    expect(rows().length).toBe(1);
    expect(selectValue()).toBe('');

    chip(0).click();
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(selectValue()).toBe('m1');
    expect(qtyInput().value).toBe('1');
  });

  it('adds one more of the same item instead of a duplicate row', () => {
    chip(0).click();
    chip(0).click();
    fixture.detectChanges();

    expect(rows().length).toBe(1);
    expect(qtyInput().value).toBe('2');
    expect(chip(0).textContent).toContain('×2');
  });

  it('adds a new row for a different item', () => {
    chip(0).click();
    chip(1).click();
    fixture.detectChanges();

    expect(rows().length).toBe(2);
    expect(selectValue(1)).toBe('m6');
  });

  it('keeps the quantity between 1 and 20 with the stepper buttons', () => {
    chip(0).click();
    fixture.detectChanges();
    const [minus, plus] = Array.from(element.querySelectorAll<HTMLButtonElement>('.row .stepper button'));

    minus.click();
    fixture.detectChanges();
    expect(qtyInput().value).toBe('1');

    for (let i = 0; i < 25; i++) {
      plus.click();
    }
    fixture.detectChanges();
    expect(qtyInput().value).toBe('20');
  });
});
