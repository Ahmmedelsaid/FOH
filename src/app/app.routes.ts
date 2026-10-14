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
    ],
  },
  { path: '**', redirectTo: 'orders' },
];
