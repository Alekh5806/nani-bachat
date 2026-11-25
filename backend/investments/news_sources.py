"""Read public filing and corporate-action data for an exchange listing."""
import json
import re
from datetime import date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation
from urllib.parse import parse_qs, quote, unquote, urlsplit
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from django.core.cache import cache

IST = ZoneInfo('Asia/Kolkata')
HEADERS = {'User-Agent': 'PoolVest/1.0 (group portfolio tracker)'}
NSE_MCP = 'https://mcp.nseindia.in/bhavcopy/cm/mcp'
SOURCE_UPDATING = 'Updating source.'


class SourceError(ValueError):
    pass


def cached_source(key, fetch, *, cache_only=False, remember_failure=False):
    """Cache public data only. Never cache a member's eligibility or receipt status."""
    key = f'stock-news-v1:{key}'
    snapshot = cache.get(key)
    now = datetime.now(IST)
    if snapshot and now - snapshot[0] < timedelta(minutes=30):
        return snapshot[1], None
    failure_key = f'{key}:failed'
    if (cache_only or remember_failure) and cache.get(failure_key):
        if snapshot:
            return snapshot[1], f'Showing data from {snapshot[0]:%d %b, %H:%M} IST.'
        return None, 'Temporarily unavailable.'
    if cache_only:
        return snapshot[1] if snapshot else None, SOURCE_UPDATING
    try:
        value = fetch()
    except (requests.RequestException, ValueError, KeyError, TypeError, IndexError,
            AttributeError, InvalidOperation, OverflowError):
        if remember_failure:
            cache.set(failure_key, True, 60)
        if snapshot:
            return snapshot[1], f'Showing data from {snapshot[0]:%d %b, %H:%M} IST.'
        return None, 'Temporarily unavailable.'
    cache.set(key, (now, value), 7 * 86400)
    cache.delete(failure_key)
    return value, None


def get_page(url):
    response = requests.get(url, headers=HEADERS, timeout=(2, 3))
    response.raise_for_status()
    return BeautifulSoup(response.content, 'html.parser')


def company_filings(symbol):
    code, exchange = symbol.rsplit('.', 1)
    page = get_page(f'https://www.screener.in/company/{quote(code, safe="")}/')
    nse_codes, bse_listings = set(), set()
    for anchor in page.select('a[href]'):
        link = urlsplit(anchor['href'])
        if link.hostname == 'www.nseindia.com' and link.path == '/get-quotes/equity':
            nse_codes.update(parse_qs(link.query).get('symbol', []))
        if link.hostname == 'www.bseindia.com':
            match = re.fullmatch(r'/stock-share-price/[^/]+/([^/]+)/(\d{6})/', link.path)
            if match:
                bse_listings.add((unquote(match[1]).upper(), match[2]))
    if exchange == 'NS' and code not in nse_codes:
        raise SourceError('NSE listing mismatch')
    if exchange == 'BO':
        bse_listings = {listing for listing in bse_listings if code in listing}
        if len(bse_listings) != 1:
            raise SourceError('BSE listing mismatch')
    section = page.select_one('#company-announcements-tab')
    if section is None:
        raise SourceError('Missing filings section')
    filings = []
    for anchor in section.select('li a[href]'):
        link = urlsplit(anchor['href'])
        if link.scheme != 'https' or link.hostname not in {
            'www.bseindia.com', 'www.nseindia.com', 'nsearchives.nseindia.com',
        }:
            continue
        stamp = anchor.find('time', datetime=True)
        if stamp is None:
            continue
        day = datetime.fromisoformat(stamp['datetime']).astimezone(IST).date()
        title = ' '.join(part.strip() for part in anchor.find_all(string=True, recursive=False)).strip()
        if title:
            filings.append(dict(kind='Filing', title=title, date=day, url=anchor['href']))
    bse_listing = next(iter(bse_listings)) if len(bse_listings) == 1 else None
    return filings, bse_listing


def dividend_dates(exchange, code):
    """S&P Global calendar. Historical amounts here may be split adjusted."""
    url = f'https://stockanalysis.com/quote/{exchange}/{quote(code, safe="")}/dividend/'
    page = get_page(url)
    # The canonical URL of a BSE page may point at its NSE primary listing.
    # The page title identifies the actual displayed exchange and code.
    identity = f'({exchange}:{code})'.upper()
    if not page.title or identity not in page.title.get_text(strip=True).upper():
        raise SourceError('Calendar listing mismatch')
    for table in page.select('table'):
        headers = [' '.join(th.get_text().split()) for th in table.select('thead th')]
        aliases = {'Ex-Dividend Date': 'Ex-Div Date', 'Cash Amount': 'Amount'}
        headers = [aliases.get(header, header) for header in headers]
        if not {'Ex-Div Date', 'Record Date', 'Pay Date'}.issubset(headers):
            continue
        dates = {}
        for row in table.select('tbody tr'):
            fields = dict(zip(headers, [td.get_text(strip=True) for td in row.select('td')]))
            def read_date(column):
                try:
                    return datetime.strptime(fields[column], '%b %d, %Y').date()
                except (ValueError, KeyError):
                    return None
            ex = read_date('Ex-Div Date')
            if ex:
                amount = re.fullmatch(r'([0-9]+(?:\.[0-9]+)?) INR', fields.get('Amount', ''))
                details = dict(record=read_date('Record Date'), pay=read_date('Pay Date'),
                               rate=Decimal(amount[1]) if amount else None, url=url)
                if ex in dates:
                    # Multiple distributions can share an ex-date. Do not assign
                    # a component's pay date or a guessed rate to the whole day.
                    prior = dates[ex]
                    for key in ('record', 'pay'):
                        if prior[key] != details[key]:
                            details[key] = None
                    details['rate'] = None
                dates[ex] = details
        return dates
    if re.search(r'(does not pay|has never paid|has not paid|no dividend history)', page.get_text(' ', strip=True), re.I):
        return {}
    raise SourceError('Unrecognized dividend calendar')


def nse_actions(code, start, end):
    with requests.Session() as session:
        session.headers.update({**HEADERS, 'Accept': 'application/json, text/event-stream'})
        def rpc(number, method, params):
            body = {'jsonrpc': '2.0', 'method': method, 'params': params}
            if number is not None:
                body['id'] = number
            response = session.post(NSE_MCP, json=body, timeout=(2, 3))
            response.raise_for_status()
            if method == 'initialize' and response.headers.get('Mcp-Session-Id'):
                session.headers['Mcp-Session-Id'] = response.headers['Mcp-Session-Id']
            if number is None:
                return
            if 'text/event-stream' in response.headers.get('Content-Type', ''):
                replies = (json.loads(line[5:]) for line in response.text.splitlines()
                           if line.startswith('data:'))
                reply = next((msg for msg in replies if msg.get('id') == number), {})
            else:
                reply = response.json()
            if reply.get('id') != number or 'result' not in reply:
                raise SourceError('Invalid NSE response')
            return reply['result']

        version = '2025-03-26'
        init = rpc(1, 'initialize', {'protocolVersion': version, 'capabilities': {},
                                     'clientInfo': {'name': 'PoolVest', 'version': '1.0'}})
        if init['protocolVersion'] != version:
            raise SourceError('Unsupported NSE protocol')
        session.headers['MCP-Protocol-Version'] = version
        rpc(None, 'notifications/initialized', {})
        reply = rpc(2, 'tools/call', {'name': 'get_corporate_actions', 'arguments': {
            'symbol': code, 'fromDate': start.isoformat(), 'toDate': end.isoformat(),
        }})
    data = json.loads(reply['content'][0]['text'])
    if (reply.get('isError') or data.get('error') or data.get('warning')
            or data.get('symbol') != code or not isinstance(data.get('actions'), list)):
        raise SourceError('Incomplete NSE actions')
    url = f'https://www.nseindia.com/get-quotes/equity?symbol={quote(code, safe="")}'
    result = []
    for item in data['actions']:
        title = item['purpose'].strip()
        day = date.fromisoformat(item['exDate'])
        kind = {'SPLIT': 'Split', 'BONUS': 'Bonus', 'DIVIDEND': 'Dividend'}.get(item['actionType'], 'Corporate action')
        result.append(dict(kind=kind, title=title, date=day, rate=nse_dividend_rate(title)
                           if kind == 'Dividend' else None, url=url))
    return result


def nse_dividend_rate(purpose):
    # Accept only complete cash-per-share clauses. A percentage, face value,
    # proposal, or unmatched component cannot safely determine an entitlement.
    clause = (r'(?:(?:interim|final|special)\s+)?dividend\s*[-:]?\s*'
              r'(?:rs\.?|re\.?|inr|₹)\s*(\d+(?:\.\d+)?)\s+per\s+(?:equity\s+)?share')
    parts = list(re.finditer(clause, purpose, re.I))
    remainder = re.sub(clause, '', purpose, flags=re.I)
    if not parts or re.sub(r'(?:\band\b|[\s/,&+;-])+', '', remainder, flags=re.I):
        return None
    return sum(Decimal(part[1]) for part in parts)


def bse_actions(symbol, start, today):
    def timestamp(day):
        return int(datetime.combine(day, time.min, IST).timestamp())
    response = requests.get(
        f'https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol, safe="")}',
        params={'period1': timestamp(start), 'period2': timestamp(today + timedelta(days=1)),
                'interval': '1d', 'events': 'div,splits'}, headers=HEADERS, timeout=(2, 3))
    response.raise_for_status()
    chart = response.json()['chart']['result'][0]
    meta = chart['meta']
    if meta['symbol'] != symbol or meta['currency'] != 'INR' or meta['exchangeName'] != 'BSE':
        raise SourceError('BSE listing mismatch')
    events = chart.get('events', {})
    url = f'https://finance.yahoo.com/quote/{quote(symbol, safe="")}/history/'
    results = []
    for key, kind in [('splits', 'Split'), ('dividends', 'Dividend')]:
        for event in events.get(key, {}).values():
            day = datetime.fromtimestamp(event['date'], IST).date()
            rate = None
            title = 'Cash dividend'
            if kind == 'Split':
                title = f"Share adjustment · {event['splitRatio']}"
            elif not any(item['kind'] == 'Split' and item['date'] >= day for item in results):
                # Yahoo historical dividends can be restated after a split.
                rate = Decimal(str(event['amount']))
                if not rate.is_finite() or rate <= 0:
                    raise SourceError('Invalid BSE dividend rate')
            results.append(dict(kind=kind, date=day, title=title, rate=rate, url=url))
    return results
