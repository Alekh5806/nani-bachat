# Screens

Order of cards on each screen. Keep the order. Titles are Title Case.

## Tabs

### Home (`DashboardScreen`)
The Portfolio header shows the club month. Cards use one or two columns according to the available content width and system text size. Rotating or resizing preserves the selected history range and snapshot.

1. **Portfolio value.** The club balance, invested capital and all-time return appear above Value History. The history compares recorded balance snapshots and offers 7-day, 30-day, 90-day, 365-day and all-history ranges. Refresh reloads Home.
2. **Balance Breakdown.** Stock value, signed club cash and dividends make up the balance. A proportional bar appears when all balances are nonnegative. Return Breakdown shows realized stock P&L, unrealized stock P&L and dividend income. View stocks opens the stock list.
3. **Top Holdings.** The ring and percentages use the value of stock holdings. The five largest positions are listed individually and the remainder are grouped. View investments opens Invest.
4. **Dividends.** All-time income and the last four calendar quarters by ex-dividend date. A zero quarter has an empty track. View history opens Dividend.

### Invest (`InvestmentsScreen`)
1. **Holdings summary** (`SummaryCard`): "Holdings (N)", current value, round refresh button (admin only, spinner while loading, result as a toast), 1D returns, Total returns, Invested.
2. **Realized P/L** (`SummaryCard`, only if something was sold): value, Return, Net sale proceeds, Cost, footnote.
3. Tabs **Holdings** and **History**. Holdings is a list of `StockRow`. History is buys and sells, newest first.
- Opens `HoldingDetail` for one holding (purchases, edit, sell, sales).

### Member (`MembersScreen`)
Header action: Add (solid primary, admin only): Add Member on the Member tab, Generate month on the Contribution tab. Tabs **Member**, **Contribution**, **History**; only the active one renders.
1. **Member** tab: one `SummaryCard` (your ownership value, profit/loss, contributed, dividends, group total, average), "All Members" list in the list-row spec (`MemberRow`). Opens `MemberDetail`.
2. **Contribution** tab: `ContributionsScreen` embedded (`embedded view="contributions"`): `SummaryCard` (this month collected, Paid, Pending, total collected), a "Month" row (button opening `MonthPickerDialog`, plus a round "more" button for admins that opens a dialog with Clean up unpaid, Delete month and Rebuild pool totals), a tinted "months need settling" box (admin), and the Monthly Cash card (settled/open pill, pool rows, buyer chosen with the common `BuyerPicker`, `PremiumButton` Settle month). The header Add button opens Generate month on this tab (and Add Member on the Member tab; History has no header action).
3. **History** tab: same embedded screen (`view="history"`): Unpaid and Paid chips (no month filter). Unpaid loads in one request; Paid loads one month at a time, latest first, as the user scrolls, with a month button (opens a year and month grid picker: All months or one month) at the right of the status chips (the Members ScrollView calls the screen's load-more near the bottom). Then the Dividends-style list: a grey band per month ("Nov 2026", "9/11 paid"), rows with avatar, name, paid date (paid only), amount and admin edit/mark-paid icons.
`ContributionsScreen` still works standalone (from `MemberDetail`, with a back arrow and its own header).

`MemberDetail`: profile card (avatar, name, phone, email), spec-sheet totals card, then the Dividends-style history: a grey band per year ("2026", "9/11 paid"), rows with month, paid date, amount and Paid/Unpaid.

### Dividend (`DividendsScreen`)
1. **Dividends summary** (`SummaryCard`): total, This month, This year, Last received.
2. Info title row "Dividends" and "Total amount (Shares)".
3. Months as bands ("Nov 2026" with the month total), under each a list of rows in the list-row spec.
- "Add" (admin) opens `AddDividend`: `HoldingSelect`, per-share amount, dates, notes, preview.

## Not a tab

- **Profile:** blue hero card (avatar, name, phone, email, "Change avatar" button), then settings rows (40px round tinted icon, label 14, pill and/or chevron): Role (pill), Appearance (tap steps System, Light, Dark), Monthly report, then a divider and Log out (red). App version at the bottom. Opened from the header avatar. Has a back arrow.
- **Stocks (`AssetStocksScreen`):** opened from Balance Breakdown. `SummaryCard` (Stocks, current, Total returns, Invested, Allocation) and the list of all stocks. Tap a stock to open its holding detail.
- **Login:** 3D illustration, phone, password, Sign In. No remember-me box.

## States every screen needs

Loading (skeleton or spinner), empty (one quiet line), error (toast), pull to refresh on lists.
