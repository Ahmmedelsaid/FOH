import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { MenuApi } from '../../../core/api/menu-api.service';
import { OrdersApi } from '../../../core/api/orders-api.service';
import { MenuItem } from '../../../core/models/menu.model';
import { TYPE_LABELS } from '../../../core/models/order-labels';
import { ORDER_TYPES, OrderType } from '../../../core/models/order.model';
import { calculatePrice, itemsSubtotal, lineTotal } from '../../../core/pricing/pricing';
import { egyptianMobile, minArrayLength } from './order-form.validators';

type ItemGroup = FormGroup<{
  menuId: FormControl<string>;
  qty: FormControl<number>;
  note: FormControl<string>;
}>;

type MenuState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'loaded'; menu: MenuItem[] };

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
})
export class OrderFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ordersApi = inject(OrdersApi);
  private readonly menuApi = inject(MenuApi);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reloadMenu$ = new Subject<void>();

  protected readonly types = ORDER_TYPES;
  protected readonly typeLabels = TYPE_LABELS;

  protected readonly form = this.fb.group({
    type: this.fb.control<OrderType>('dine-in'),
    table: this.fb.control<number | null>(null),
    phone: this.fb.control(''),
    items: this.fb.array<ItemGroup>([this.createItem()], minArrayLength(1)),
  });

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly menuState = toSignal(
    this.reloadMenu$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.menuApi.menu$.pipe(
          map((menu): MenuState => ({ kind: 'loaded', menu })),
          startWith<MenuState>({ kind: 'loading' }),
          catchError(() => of<MenuState>({ kind: 'error' })),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as MenuState },
  );

  private readonly menuById = computed<ReadonlyMap<string, MenuItem>>(() => {
    const state = this.menuState();
    return new Map(state.kind === 'loaded' ? state.menu.map((item) => [item.id, item]) : []);
  });

  /** Menu items grouped by category, for <optgroup>s in the select. */
  protected readonly menuGroups = computed(() => {
    const groups = new Map<string, MenuItem[]>();
    for (const item of this.menuById().values()) {
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    }
    return [...groups].map(([category, items]) => ({ category, items }));
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { requireSync: true },
  );

  /** Running total, recalculated on every form change. */
  protected readonly price = computed(() => {
    const { type, items } = this.formValue();
    return calculatePrice(itemsSubtotal(items, this.menuById()), type);
  });

  /** One line per picked item for the summary panel (rows without an item yet are skipped). */
  protected readonly summaryLines = computed(() => {
    const menu = this.menuById();
    return this.formValue()
      .items.filter((item) => menu.has(item.menuId))
      .map((item) => ({ qty: item.qty, name: menu.get(item.menuId)?.name ?? '', total: lineTotal(item, menu) }));
  });

  constructor() {
    const { type } = this.form.controls;
    type.valueChanges
      .pipe(startWith(type.value), takeUntilDestroyed())
      .subscribe((value) => this.applyTypeRules(value));
  }

  protected get items() {
    return this.form.controls.items;
  }

  protected addItem(): void {
    this.items.push(this.createItem());
  }

  protected removeItem(index: number): void {
    this.items.removeAt(index);
    this.items.markAsTouched();
  }

  protected retryMenu(): void {
    this.reloadMenu$.next();
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstProblem();
      return;
    }

    const { type, table, phone, items } = this.form.getRawValue();
    this.submitting.set(true);
    this.submitError.set(null);

    this.ordersApi
      .create({
        type,
        table: type === 'dine-in' ? table : null,
        phone: type === 'delivery' ? phone.trim() : null,
        items: items.map((item) => ({ menuId: item.menuId, qty: item.qty, note: item.note.trim() })),
      })
      .subscribe({
        // Stay in the submitting state on success so the button can't be clicked again while navigating.
        next: (order) => void this.router.navigate(['/orders'], { state: { createdOrder: order.number } }),
        error: () => {
          this.submitting.set(false);
          this.submitError.set("Couldn't create the order. Please check your connection and try again.");
        },
      });
  }

  protected errorMessage(control: AbstractControl): string | null {
    if (!control.errors || !(control.touched || control.dirty)) {
      return null;
    }
    const errors = control.errors;
    if (errors['required']) {
      return 'This field is required.';
    }
    if (errors['egyptianMobile']) {
      return 'Enter an Egyptian mobile number, e.g. 01012345678.';
    }
    if (errors['pattern']) {
      return 'Enter a whole number.';
    }
    if (errors['min']) {
      return `Must be at least ${errors['min'].min}.`;
    }
    if (errors['max']) {
      return `Must be at most ${errors['max'].max}.`;
    }
    return 'This value is not valid.';
  }

  private focusFirstProblem(): void {
    const root = this.host.nativeElement;
    const target =
      root.querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid') ??
      root.querySelector<HTMLElement>('[data-add-item]');
    target?.focus();
  }

  private createItem(): ItemGroup {
    return this.fb.group({
      menuId: this.fb.control('', Validators.required),
      qty: this.fb.control(1, [
        Validators.required,
        Validators.min(1),
        Validators.max(20),
        Validators.pattern(/^\d+$/),
      ]),
      note: this.fb.control(''),
    });
  }

  /** Table is required for dine-in, phone for delivery; the other field is cleared and not validated. */
  private applyTypeRules(type: OrderType): void {
    const { table, phone } = this.form.controls;

    if (type === 'dine-in') {
      table.setValidators([Validators.required, Validators.min(1), Validators.max(40), Validators.pattern(/^\d+$/)]);
    } else {
      table.clearValidators();
      table.reset(null);
    }

    if (type === 'delivery') {
      phone.setValidators([Validators.required, egyptianMobile()]);
    } else {
      phone.clearValidators();
      phone.reset('');
    }

    table.updateValueAndValidity();
    phone.updateValueAndValidity();
  }
}
