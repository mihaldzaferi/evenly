# Evenly

Split group expenses with friends, in any currency, and settle up in the
fewest possible payments. No account, no backend: your data stays in your
browser, and groups are shared as self-contained links.

[![CI](https://github.com/mihaldzaferi/evenly/actions/workflows/ci.yml/badge.svg)](https://github.com/mihaldzaferi/evenly/actions/workflows/ci.yml)

**Live demo:** https://mihaldzaferi.github.io/evenly/ (press *Try it with example data*)

![Evenly's overview: what you're owed, how it adds up, and the payments still needed](docs/screenshot.png)

## Features

- **Always know where you stand.** The Overview leads with one line, like
  "You owe NOK 5,417.11", then lists each person you need to pay, with a
  **Pay** button, and everyone who owes you, with **Remind** and **Mark
  received** buttons. A receipt-style breakdown shows how the number adds up.
- **Pay in a couple of taps.** Pay opens a sheet with the exact amount
  already worked out. *Copy amount & open Vipps* puts the amount on your
  clipboard and opens Vipps, ready to paste. A PayPal.me link opens PayPal
  with the amount filled in, and bank details are one tap to copy. Press
  *I've paid* when it's sent, and everyone's balance updates. (Evenly never
  touches money itself; see [Payments](#payments).)
- **Four ways to split.** Equally, by exact amounts, by percentage, or by
  shares ("2 shares for the double room, 1 for a single"), with a live
  preview of what each person owes.
- **Any currency, with automatic rates.** Log each expense in the currency
  you paid in, any of 160+, and the exchange rate for that day is fetched
  for you. Major currencies use official European Central Bank rates (via
  [Frankfurter](https://frankfurter.dev)). Everything else, from Thai baht to
  Vietnamese dong, uses daily market rates from the free
  [currency-api](https://github.com/fawazahmed0/exchange-api). You can always
  type a rate yourself.
- **Fewest payments to settle up.** Evenly finds the smallest set of
  transfers that clears every balance. Press *Mark as paid* (or *Mark
  received*) as each one happens, and a progress bar shows how much has been
  paid back.
- **Share by link.** The whole group is compressed into the link itself, so
  a friend can open it and add the group to their own device. No server sees it.
- **Stats.** Spending per day or month, by category, and who paid versus who
  consumed. Every chart also has a table view.
- **Works offline and installs like an app.** It has a service worker and a
  web app manifest, and it supports dark mode.
- **Import and export.** Download a group as CSV for Excel or Google Sheets, or
  back up everything as JSON and restore it later.
- **Undo instead of "are you sure?".** Deleting an expense, payment or group
  shows an undo button.

<p>
  <img src="docs/add-expense.png" alt="Adding an expense in euros, split by shares, inside a group kept in Norwegian kroner" width="58%">
  <img src="docs/mobile.png" alt="The overview on a phone" width="26%">
</p>

![Stats for a shared flat in dark mode](docs/stats-dark.png)

## How it works

### Money is exact

Amounts are stored as integers in the currency's smallest unit (cents, øre,
or whole yen), so there's no floating-point drift. Every split, in every
mode, goes through one function, `allocate()`. It hands out the leftover
units with the
[largest remainder method](https://en.wikipedia.org/wiki/Largest_remainder_method),
so the shares always add up to exactly the total. A €10 bill split three
ways is €3.34 + €3.33 + €3.33, never €9.99.

### Settling up in the fewest payments

If *n* people have a non-zero balance, *n − 1* payments are always enough.
You can often do better, though. When the group splits into *k* subgroups
whose balances each add up to zero, *n − k* payments are enough, and that is
the minimum. Plain "largest debtor pays largest creditor" matching misses
this:

| Balances | Greedy matching | Evenly |
| --- | --- | --- |
| +4, +3, +2, −5, −4 | 4 payments | 3 payments: (−4 → +4) and (−5 → +3, +2) |

Evenly finds the partition with the most zero-sum subgroups using dynamic
programming over subsets, which takes O(n·2ⁿ) time and is instant for up to
16 people with open balances. It then settles each subgroup with greedy
matching. Larger groups fall back to greedy alone. The test suite checks the
result against a brute-force search on hundreds of random groups
([`test/balances.test.ts`](test/balances.test.ts)).

### Share links without a server

A share link looks like `…/#/import?g=1.<data>`. The group is turned into
JSON, compressed with the browser's built-in `CompressionStream` (deflate),
and base64url-encoded. The example trip, with 14 expenses, fits in about
1,500 characters. Everything after the `#` stays in the browser and is never
sent to any server. On import, the data is checked field by field
([`src/lib/validate.ts`](src/lib/validate.ts)), so a hand-edited link can't
break your balances.

## Payments

Evenly works out *who should pay whom and how much*, then hands you over to
the app you already use to send it:

| Method | What the Pay button does |
| --- | --- |
| Vipps | Copies the amount the way your phone types it (`5417,11` in Norway) and, on a phone, opens the Vipps app; shows the person's number to pick |
| PayPal | Opens `paypal.me/<name>/<amount><currency>` with the amount filled in |
| Bank transfer | Copies the account number and the amount |

Each person adds their own details under *Settings → People*, or straight
from the Pay sheet. They travel with share links so the whole group has them.

Why not send the money straight from the page? A website can't move money
between two people without being a licensed payment provider. Vipps only
offers its payment API to registered businesses, and there's no public link
that fills in a person and an amount. Apple Pay on the web only pays
merchants, and person-to-person Apple Cash exists only in the US. So Evenly
does everything up to the transfer and records it once you confirm.

## Tech stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org), built with [Vite](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com) with semantic colour tokens for light and dark mode
- [Zustand](https://zustand.docs.pmnd.rs) for state, saved to `localStorage`
- [React Router](https://reactrouter.com) (hash routing, so deep links work on GitHub Pages)
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for tests
- Native `<dialog>` for modals, which gives focus trapping and Esc to close for free

## Getting started

Requires Node 20.19 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # unit + component tests
npm run lint       # ESLint
npm run typecheck  # tsc
npm run build      # production build in dist/
```

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>N</kbd> | Add an expense |
| <kbd>P</kbd> | Record a payment |
| <kbd>/</kbd> | Search expenses |
| <kbd>Esc</kbd> | Close a dialog |

## Project structure

```
src/
  lib/          Pure logic, no React. Most of the tests live here.
    money.ts      Parsing, formatting, conversion, allocate()
    split.ts      Turning a split into per-person shares
    balances.ts   Per-member totals and the settle-up algorithm
    share.ts      Share-link encoding and decoding
    validate.ts   Checking imported data
    stats.ts      Totals by day, month and category
    csv.ts        CSV export
  store/        Zustand store (saved to localStorage) and toasts
  components/   Dialogs, charts, avatars and other shared UI
  pages/        Home, new group, import, and the group tabs:
                Overview, Expenses, Stats, Settings
test/           Vitest suites
```

## Deploying

Pushing to `main` runs two GitHub Actions workflows:

- **CI** runs lint, type checks, tests and the build.
- **Deploy to GitHub Pages** builds the app and publishes `dist/`. Turn it on
  once under *Settings → Pages → Source: GitHub Actions*.

The build uses relative asset paths and hash routing, so it also works from
any static host or sub-folder without changes.

## Privacy

Evenly has no backend. Groups live in your browser's `localStorage`. The
only network requests the app makes are for exchange rates when you add an
expense in a foreign currency. They go to `api.frankfurter.dev`, or to
`cdn.jsdelivr.net` with a `currency-api.pages.dev` fallback, and contain
only currency codes and a date.

## License

MIT
