# Screens

Order of cards on each screen. Keep the order. Titles are Title Case.

## Tabs

### Home (`DashboardScreen`)
Header "Portfolio" with the month. Cards in order:
1. **Value card.** "Total Balance", big value, change with period, line chart (height 120), range chips (1W, 1M, 3M, 1Y, ALL).
2. **Summary.** 3 by 3 grid with inner lines: Invested, Current value, Cash, Stocks value, P&L, Total returns, Realized P&L, Unrealized P&L, Dividends. Short rupee format. No title.
3. **Top Holdings.** Title and "View all". Donut with the five largest holdings, then a list of name and percent only.
4. **Asset Allocation.** Half donut, Stocks and Club Cash rows. The whole card opens the Stocks screen.
5. **Dividends.** Total, "Received from ... till date", last four calendar quarters as bars (zero quarters show 0). The card opens Dividends.

### Invest (`InvestmentsScreen`)
1. **Holdings summary** (`SummaryCard`): "Holdings (N)", current value, round refresh button (admin only, spinner while loading, result as a toast), 1D returns, Total returns, Invested.
2. **Realized P/L** (`SummaryCard`, only if something was sold): value, Return, Net sale proceeds, Cost, footnote.
3. Tabs **Holdings** and **History**. Holdings is a list of `StockRow`. History is buys and sells, newest first.
- Opens `HoldingDetail` for one holding (purchases, edit, sell, sales).

### Member (`MembersScreen`)
1. Ownership card.
2. **Members summary** (`SummaryCard`): total contributed, Average per member, Active members.
3. Admin buttons: Add Member, Contributions.
4. "All Members" list. Opens `MemberDetail`. Contributions has a back arrow.

### Dividend (`DividendsScreen`)
1. **Dividends summary** (`SummaryCard`): total, This month, This year, Last received.
2. Info title row "Dividends" and "Total amount (Shares)".
3. Months as bands ("Nov 2026" with the month total), under each a list of rows in the list-row spec.
- "Add" (admin) opens `AddDividend`: `HoldingSelect`, per-share amount, dates, notes, preview.

## Not a tab

- **Profile:** avatar (tap to change), name, phone, role, theme (System, Light, Dark), Download Monthly Report, Logout. Opened from the header avatar. Has a back arrow.
- **Stocks (`AssetStocksScreen`):** opened from Asset Allocation. `SummaryCard` (Stocks, current, Total returns, Invested, Allocation) and the list of all stocks. Tap a stock to open its holding detail.
- **Login:** 3D illustration, phone, password, Sign In. No remember-me box.

## States every screen needs

Loading (skeleton or spinner), empty (one quiet line), error (toast), pull to refresh on lists.
