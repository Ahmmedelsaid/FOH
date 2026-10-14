import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { MenuItem } from '../models/menu.model';
import { API_URL } from './api-url.token';

@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_URL)}/menu`;

  /** The menu rarely changes, so it is fetched once and shared. A failed request is not cached. */
  readonly menu$: Observable<MenuItem[]> = this.http.get<MenuItem[]>(this.url).pipe(shareReplay(1));
}
