"""An authenticated feed across the pool's holdings."""
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import date
from hashlib import sha256
import json
import logging
import re
from threading import Lock
from urllib.parse import urlsplit

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .news_sources import SOURCE_UPDATING
from .stock_news import (
    build_feed, feed_window, load_feed_sources, portfolio_lots, qualifying_receipts, stock_listings,
)

RECENT_PAGE_SIZE = 20
SOURCE_WAIT_SECONDS = 6
MAX_SOURCE_JOBS = 48
source_workers = ThreadPoolExecutor(max_workers=6, thread_name_prefix='stock-news')
source_jobs = {}
source_lock = Lock()
logger = logging.getLogger(__name__)


def refresh_sources(job):
    try:
        load_feed_sources(*job, remember_failure=True)
    except Exception:
        logger.exception('Could not refresh news sources for %s', job[0])
    finally:
        with source_lock:
            source_jobs.pop(job, None)


def portfolio_sources(holdings, today):
    # Only public lookups run in workers; stock lots and dividend receipts stay on the request thread.
    windows = {symbol: feed_window(lots, today) for symbol, lots in holdings.items()}
    snapshots = {}
    pending = {}
    for symbol, window in windows.items():
        snapshot = load_feed_sources(symbol, window, today, cache_only=True)
        if SOURCE_UPDATING not in snapshot[-1].values():
            snapshots[symbol] = snapshot
            continue
        job = (symbol, window, today)
        with source_lock:
            if job not in source_jobs and len(source_jobs) < MAX_SOURCE_JOBS:
                source_jobs[job] = source_workers.submit(refresh_sources, job)
            if job in source_jobs:
                pending[symbol] = source_jobs[job]
    if pending:
        wait(pending.values(), timeout=SOURCE_WAIT_SECONDS)
    for symbol in windows.keys() - snapshots.keys():
        snapshots[symbol] = load_feed_sources(symbol, windows[symbol], today, cache_only=True)
    return snapshots


def source_name(url):
    domain = urlsplit(url).hostname or ''
    for suffix, label in (
        ('nseindia.com', 'NSE'), ('bseindia.com', 'BSE'),
        ('finance.yahoo.com', 'Yahoo Finance'), ('stockanalysis.com', 'Stock Analysis'),
    ):
        if domain == suffix or domain.endswith(f'.{suffix}'):
            return label
    return domain.removeprefix('www.') or 'Source'


def feed_item(item, stock):
    kind = item['kind']
    day = item['date'].isoformat()
    identity = [stock['symbol'], kind, day]
    if kind != 'Dividend':
        identity.extend((item['url'], item['title']))
    label = 'Filed' if kind == 'Filing' else 'Ex-date'
    return {
        **item, 'id': sha256(json.dumps(identity).encode()).hexdigest(),
        'symbol': stock['symbol'], 'company': stock['name'], 'active': stock['active'],
        'source': source_name(item['url']), 'date_label': label,
        'display_date': item['date'], 'display_date_label': label,
    }


def recent_key(item):
    return -item['date'].toordinal(), item['id']


def read_cursor(value):
    if value is None:
        return None
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}\.[0-9a-f]{64}', value):
        raise ValidationError({'cursor': 'Invalid news cursor.'})
    day, item_id = value.split('.')
    try:
        return -date.fromisoformat(day).toordinal(), item_id
    except ValueError as exc:
        raise ValidationError({'cursor': 'Invalid news cursor.'}) from exc


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portfolio_news(request):
    cursor = read_cursor(request.query_params.get('cursor'))
    today = timezone.localdate()
    holdings = portfolio_lots(today)
    stocks = stock_listings(holdings)
    symbol = request.query_params.get('symbol')
    if symbol is not None and symbol not in holdings:
        raise NotFound('This stock is outside the group portfolio.')
    if symbol:
        holdings = {symbol: holdings[symbol]}

    sources = portfolio_sources(holdings, today)
    receipts_by_symbol = defaultdict(list)
    lot_symbols = {lot.pk: key for key, lots in holdings.items() for lot in lots}
    for receipt in qualifying_receipts([lot for lots in holdings.values() for lot in lots]):
        receipts_by_symbol[lot_symbols[receipt.stock_id]].append(receipt)

    upcoming, recent, issues = [], [], []
    for stock in stocks:
        key = stock['symbol']
        if key not in holdings:
            continue
        feed = build_feed(key, holdings[key], today, sources=sources[key], receipts=receipts_by_symbol[key])
        for source, message in feed['issues'].items():
            issues.append({'symbol': key, 'source': source, 'message': message,
                           'updating': message == SOURCE_UPDATING})
        for original in feed['items']:
            item = feed_item(original, stock)
            if item['kind'] != 'Filing' and item['date'] >= today:
                upcoming.append(item)
                continue
            if cursor is None or recent_key(item) > cursor:
                recent.append(item)
            payment = item.get('payment_date')
            if payment and payment >= today:
                upcoming.append({**item, 'display_date': payment, 'display_date_label': 'Payment date'})

    upcoming.sort(key=lambda item: (item['display_date'], item['symbol'], item['id']))
    recent.sort(key=recent_key)
    page = recent[:RECENT_PAGE_SIZE]
    next_cursor = f"{page[-1]['date'].isoformat()}.{page[-1]['id']}" if len(recent) > len(page) else None
    return Response({
        'stocks': stocks, 'upcoming': upcoming, 'recent': page, 'next_cursor': next_cursor,
        'issues': issues, 'as_of_date': today,
    })
