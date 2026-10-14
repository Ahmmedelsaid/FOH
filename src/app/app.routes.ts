import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  {
    path: 'orders',
    children: [
      {
        path: '',
        title: 'Orders board',
        loadComponent: () =>
          import('./features/orders/board/orders-board.component').then((m) => m.OrdersBoardComponent),
      },
      {
        path: 'new',
        title: 'New order',
        loadComponent: () =>
          import('./features/orders/new/order-form.component').then((m) => m.OrderFormComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/orders/details/order-details.component').then((m) => m.OrderDetailsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'orders' },
];
