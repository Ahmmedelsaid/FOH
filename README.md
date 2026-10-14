# Kitchen Orders Board

Angular 17 app for restaurant staff to track orders from "New" to "Served". Built for the Front of House take-home task.

## Setup

Requires Node 18.19+ (developed on Node 20).

```bash
npm install
npm run api      # mock API (json-server) on http://localhost:3000
npm start        # app on http://localhost:4200  (in a second terminal)
npm test         # unit tests (Karma + Jasmine, needs Chrome)
```

`db.json` is created from `db.seed.json` the first time you run `npm run api`, and json-server writes your changes into it (it is git-ignored). `npm run api:reset` restores the seed data.
The API URL is the `API_URL` injection token (`src/app/core/api/api-url.token.ts`).

## What is implemented

| Requirement | Where |
|---|---|
| Board `/orders`, 4 columns with counts, cards, live elapsed time, late marker | `features/orders/board` |
| Search (debounced) + type filter stored in URL query params (`?q=&type=`) | `orders-board.component.ts` |
| Move forward with optimistic update and rollback + error banner | `orders-board.store.ts` |
| Details `/orders/:id` (lazy), price breakdown, 404 handling | `features/orders/details` |
| New order `/orders/new` (lazy), FormArray, custom validators, running total, double-submit guard | `features/orders/new` |
| Auto-refresh every 15s, no overlap, no flicker, stops on leave | `orders-board.store.ts` |
| Loading / empty / error states, usable at 375px | every page |
| Bonus: unit tests, OnPush everywhere, polling paused while the tab is hidden, Arabic/English toggle with RTL, dark mode | `core/i18n`, `orders-board.store.ts` |

Not done: deployed demo.

## Decisions and why

- **Signals for state, RxJS for async.** Component and store state are signals (simple reads in templates, works well with OnPush and `computed`). Anything time-based or request-based (polling, debounce, `exhaustMap`, `switchMap`) stays in RxJS, which is better at it. They meet at `toSignal` / `takeUntilDestroyed`.
- **Board store is provided by the board component, not root.** Its polling and clock subscriptions are bound to the component's `DestroyRef`, so leaving the page stops everything. No manual unsubscribing.
- **Polling:** `merge(timer, retry)` into `exhaustMap`. Ticks that arrive while a request is in flight are ignored, so requests never overlap. Updating a signal with new data re-renders only changed cards (`@for ... track order.id`), so there is no flicker and no loading state after the first load. If a refresh fails, the old data stays and a warning banner appears.
- **Stale poll vs optimistic update.** A poll that was in flight when the user moved an order could return the old status and flip the card back. The store keeps a `mutationEpoch` counter and discards a poll response if a status change started or finished while it was running. The next poll (15s) corrects the view.
- **Rollback** restores only the one order's previous status, so other changes made meanwhile are not overwritten.
- **URL is the source of truth for filters.** The component reads `queryParamMap` as a signal; the search input only writes to the URL after the debounce. `lastPushedQuery` lets it tell its own navigations from back/forward ones.
- **One shared clock.** The store ticks a `now` signal every second and passes it to the cards as an input, instead of one interval per card.
- **Form:** conditional validation (table for dine-in, phone for delivery) is applied by swapping validators when the type changes, and the irrelevant field is cleared. Custom validators: `egyptianMobile` and `minArrayLength` (`order-form.validators.ts`).
- **Money** is rounded to 2 decimals at each step (service, then VAT), which reproduces the reference numbers (574.56 and 273.60).
- **Kitchen-first UI.** Cards preview the items and notes so staff do not need to open each order, the action button is coloured by the status the order moves to, and a header shows when the board last refreshed plus how many orders are late. The new-order form keeps a live summary (lines, service, VAT, total) next to the form on desktop.
- **Arabic/English with RTL.** A small runtime i18n service (`core/i18n`): the language is a signal, templates use an impure `t` pipe, plurals go through `Intl.PluralRules` (Arabic has six forms) and the Arabic dictionary is a typed `Record`, so a missing key fails the build. The service sets `lang` and `dir` on `<html>`, and the CSS uses logical properties (`inline-start`, `padding-inline`), so one stylesheet serves both directions. Angular's built-in i18n needs one build per language, which does not fit a toggle button.
- **Dark mode.** `ThemeService` mirrors a signal into `<html data-theme>`; all colours are CSS variables, so the dark theme only redefines tokens (and sets `color-scheme` so native inputs follow). First visit follows the OS preference. Kitchen displays are often dark, which is why it is there.
- **Order-taking speed.** The new-order form has a quick-add menu (tap an item to add it, tap again for one more) next to the normal rows, so the select is only needed for edits. Quantity has − / + buttons. Both feed the same `FormArray`, so validation and totals are unchanged.
- **Search feedback.** The board shows "Showing X of Y orders" with a clear link, highlights the matching digits on the cards, hides the columns without a match while searching (so only the found orders show), and Escape or the × button clears the search.
- No UI library: plain SCSS with a few CSS variables kept the bundle small and the code easy to explain.

## Assumptions

- Card total shows the **grand total** (service + VAT included). The task sketch shows subtotals, so this is a deliberate difference.
- Item count on a card is the sum of quantities (#1041 shows "4 items", matching the sketch).
- Search: `T7`, `t-7` or `table 7` find table 7; `#1043` or any 3+ digit number searches order numbers (substring); a 1-2 digit number is a table (exact), because tables only go up to 40. A plain substring match made `4` return every order #104x.
- Seed orders are old, so New/Preparing ones show as late (expected per the task).
- The "late" marker is shown with text as well as colour. Served orders show "done" instead of a timer.
- Quick add merges taps on the same item into one row (quantity goes up). Rows added by hand with "Add item" can still repeat an item.
- New order number = highest existing number + 1, and `id` is the number as a string. With a real backend the server would assign both; two clients creating orders at the same moment could collide here.
- The menu is fetched once and cached (`shareReplay`); a failed request is not cached.
- Mobile layout: columns scroll horizontally with snap, one column at a time.
- Digits stay Latin (0-9) in Arabic so order numbers and prices look the same in both languages.
- The API returns English menu names only, so the seed menu ids (m1-m7) are translated in the dictionary and any new item falls back to its API name. A real backend would return localized names.
- Notes typed by staff are shown as written (not translated).

## What I would improve with more time

- Tests for the store (polling overlap, rollback) with fake timers and `HttpTestingController`, and for the form component.
- Show the advance action on the details page too; toast instead of a banner for errors.
- Deployed demo with a mocked API.
- Move elapsed-time formatting to a pipe and extract the repeated loading/error state markup into a small component.
