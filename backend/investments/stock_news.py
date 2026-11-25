"""Group news is derived from purchases in this single-pool application."""
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dividends.models import Dividend
from .models import Stock
from .news_sources import bse_actions, cached_source, company_filings, dividend_dates, nse_actions


def listing(symbol):
    symbol = symbol.strip().upper()
    return symbol if '.' in symbol else f'{symbol}.NS'


def money(value):
    return str(value.quantize(Decimal('.01'), rounding=ROUND_HALF_UP))


def held_on(lots, day):
    return any(lot.buy_date <= day and (
        not lot.is_sold or (lot.sell_date is not None and lot.sell_date >= day)
    ) for lot in lots)


def dividend_item(events, lots, receipts, adjustments, details, active, today):
    day = events[0]['date']
    eligible = [lot for lot in lots if lot.qualifies_on_ex_date(day)]
    if not eligible and not (active and held_on(lots, day)):
        return None

    rate = None if any(e['rate'] is None for e in events) else sum(e['rate'] for e in events)
    if details.get('rate') is not None and rate != details['rate']:
        # Conflicting rates may indicate a revision or a split-adjusted history.
        rate = None
    # A purchase lot has no split/bonus adjustment history. Avoid assigning
    # its original share count to an event after a change in share capital.
    shares_known = adjustments is not None and not any(
        lot.buy_date < adjustment <= day for lot in eligible for adjustment in adjustments)
    shares = sum(lot.quantity for lot in eligible) if shares_known else None
    expected = money(shares * rate) if shares is not None and rate is not None else None

    # Cash is credited per demat holder. Compare unrounded entitlements for
    # each buyer so rounding or over-recording for one cannot settle another.
    expected_by_buyer = defaultdict(Decimal)
    if rate is not None:
        for lot in eligible:
            expected_by_buyer[lot.buyer_id] += lot.quantity * rate
    confirmed_by_buyer = defaultdict(Decimal)
    received = Decimal(0)
    undated = Decimal(0)
    for receipt in receipts:
        if receipt.payment_date is None:
            undated += receipt.total_dividend
        elif day <= receipt.payment_date <= today:
            received += receipt.total_dividend
            if receipt.received_quantity is not None:
                confirmed_by_buyer[receipt.stock.buyer_id] += receipt.received_quantity * receipt.dividend_per_share
    if not active and expected is not None and expected_by_buyer == confirmed_by_buyer and not undated:
        return None

    return {
        'kind': 'Dividend', 'title': ' / '.join(e['title'] for e in events),
        'date': day, 'url': events[0]['url'], 'record_date': details.get('record'),
        'payment_date': details.get('pay'), 'calendar_url': details.get('url'),
        'rate': str(rate) if rate is not None else None, 'shares': shares,
        'expected': expected, 'received': money(received), 'undated': money(undated),
        'projected': day > today,
    }


def feed_window(lots, today):
    start = min(lot.buy_date for lot in lots)
    active = any(not lot.is_sold for lot in lots)
    end = today + timedelta(days=365) if active else max(
        (lot.sell_date for lot in lots if lot.sell_date), default=today)
    return start, end, active


def load_feed_sources(symbol, window, today, *, cache_only=False, remember_failure=False):
    start, end, active = window
    code, exchange = symbol.rsplit('.', 1)
    if exchange not in {'NS', 'BO'}:
        return [], None, {}, {'Exchange': 'This exchange is not covered.'}
    issues = {}

    def load(key, label, fetch):
        data, issue = cached_source(key, fetch, cache_only=cache_only, remember_failure=remember_failure)
        if issue:
            issues[label] = issue
        return data

    filings = []
    # The BSE listing on the issuer page resolves a letter ticker to its scrip code.
    bse_code = code if code.isdigit() else None
    bse_symbol = symbol
    if active or exchange == 'BO':
        company = load(f'filings:{symbol}', 'Screener filings', lambda: company_filings(symbol))
        if company:
            filings, bse_listing = company
            if bse_listing and exchange == 'BO':
                ticker, bse_code = bse_listing
                bse_symbol = f'{ticker}.BO'

    def get_actions():
        if exchange == 'NS':
            return nse_actions(code, start, end)
        return bse_actions(bse_symbol, start, today)

    period = 'active' if active else end.isoformat()
    actions_source = 'NSE corporate actions' if exchange == 'NS' else 'Yahoo Finance corporate actions'
    actions = load(f'actions:{symbol}:{start}:{period}', actions_source, get_actions)
    date_code = code if exchange == 'NS' else bse_code
    calendar = {}
    if date_code:
        calendar = load(f'dates:{symbol}', 'Stock Analysis dividend calendar', lambda: dividend_dates(
            'nse' if exchange == 'NS' else 'bom', date_code)) or {}
    return filings, actions, calendar, issues


def qualifying_receipts(lots):
    by_id = {lot.pk: lot for lot in lots}
    receipts = Dividend.objects.filter(stock_id__in=by_id).select_related('stock')
    return [receipt for receipt in receipts if by_id[receipt.stock_id].qualifies_on_ex_date(receipt.ex_date)]


def build_feed(symbol, lots, today, *, sources=None, receipts=None):
    window = feed_window(lots, today)
    start, end, active = window
    filings, actions, calendar, issues = sources if sources is not None else load_feed_sources(symbol, window, today)
    items = [f for f in filings if active and f['date'] <= today and held_on(lots, f['date'])]
    adjustments = None if actions is None else set()
    unique = {(a['kind'], a['date'], a['title']): a for a in (actions or []) if start <= a['date'] <= end}
    by_day = defaultdict(list)
    for event in unique.values():
        day = event['date']
        if event['kind'] == 'Dividend':
            by_day[day].append(event)
        else:
            if event['kind'] in {'Split', 'Bonus'}:
                adjustments.add(day)
            if active and held_on(lots, day):
                items.append(event)

    for day, details in calendar.items():
        if not start <= day <= end or day in by_day:
            continue
        # Historical calendar rates can be split-adjusted. Still surface the
        # date when the original cash rate is unavailable.
        rate = details['rate'] if day >= today else None
        by_day[day].append(dict(kind='Dividend', title='Cash dividend', date=day,
                                rate=rate, url=details['url']))

    by_ex_date = defaultdict(list)
    for receipt in receipts if receipts is not None else qualifying_receipts(lots):
        by_ex_date[receipt.ex_date].append(receipt)
    for day, events in by_day.items():
        item = dividend_item(events, lots, by_ex_date[day], adjustments, calendar.get(day, {}), active, today)
        if item:
            items.append(item)
    unique_items = {(i['date'], i['kind'], i['url'], i['title']): i for i in items}
    ordered = sorted(unique_items.values(), key=lambda i: (
        i['date'] < today, abs((i['date'] - today).days), i['kind'], i['title']))
    return {'items': ordered, 'issues': issues}


def portfolio_lots(today):
    by_symbol = defaultdict(list)
    lots = Stock.objects.filter(buy_date__lte=today).only(
        'id', 'symbol', 'quantity', 'name', 'buy_date', 'is_sold', 'sell_date', 'buyer_id').order_by(
            '-buy_date', 'symbol', '-id')
    for lot in lots:
        by_symbol[listing(lot.symbol)].append(lot)
    return by_symbol


def stock_listings(by_symbol):
    listings = [
        {'symbol': symbol, 'name': lots[0].name, 'active': any(not lot.is_sold for lot in lots)}
        for symbol, lots in by_symbol.items()
    ]
    return sorted(listings, key=lambda s: (not s['active'], s['symbol']))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_news(request):
    today = timezone.localdate()
    by_symbol = portfolio_lots(today)
    requested = request.query_params.get('symbol')
    if requested is None:
        return Response({'stocks': stock_listings(by_symbol)})
    if requested not in by_symbol:
        return Response({'detail': 'This stock is outside the group portfolio.'}, status=404)
    feed = build_feed(requested, by_symbol[requested], today)
    issue_labels = {
        'Screener filings': 'Company filings',
        'NSE corporate actions': 'Corporate actions',
        'Yahoo Finance corporate actions': 'Corporate actions',
        'Stock Analysis dividend calendar': 'Dividend calendar',
    }
    return Response({
        'items': feed['items'],
        'issues': [f'{issue_labels[source]}: {message}' if source in issue_labels else message
                   for source, message in feed['issues'].items()],
    })
