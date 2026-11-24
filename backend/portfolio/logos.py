"""Company logo lookup (separate from the stock-data provider).

Several logo sources are tried in order for the same Yahoo symbol the app
already stores (for example ``TCS.NS``). The first one that has a logo wins and
its URL is cached, so no source is asked twice for the same company. If none
has a logo the app shows the company's first letter.

To add or reorder a source, edit PROVIDERS at the bottom of this file.
"""
import io
import logging
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, urlparse

import requests
from django.core.cache import cache

logger = logging.getLogger(__name__)

FOUND_TTL = 60 * 60 * 24 * 30
MISSING_TTL = 60 * 60 * 24
MAX_SYMBOLS = 30
MIN_ICON_SIZE = 64  # smaller favicons look blurry in the app


def _cache_key(symbol):
    return f'company_logo_{symbol}'


def _image_ok(url, **kwargs):
    """True when the URL answers 200 with an image and not a placeholder tile."""
    response = requests.get(url, timeout=5, stream=True, **kwargs)
    try:
        return (
            response.status_code == 200
            and not response.headers.get('X-Logo-Fallback')
            and 'image' in response.headers.get('Content-Type', '')
        )
    finally:
        response.close()


def _base(symbol):
    return symbol.rsplit('.', 1)[0] if symbol.endswith(('.NS', '.BO')) else symbol


# Logos whose file name cannot be guessed from the symbol (for example Groww's
# ISIN_timestamp.png files). Key is the symbol without .NS/.BO.
MANUAL_LOGOS = {
    'NSDL': 'https://assets-netstorage.groww.in/stock-assets/logos2/INE301O01023_1754064100.png',
}


def _manual(symbol):
    return MANUAL_LOGOS.get(_base(symbol))


def _india_api(symbol):
    url = f'https://api.dharun.dev/v1/logos/{quote(symbol, safe="")}?format=png&size=128&fallback=none'
    return url if _image_ok(url) else None


def _groww_cdn(symbol):
    base = quote(_base(symbol), safe='')
    for ext in ('webp', 'png'):
        url = f'https://assets-netstorage.groww.in/stock-assets/logos2/{base}.{ext}'
        if _image_ok(url):
            return url
    return None


def _groww_search(symbol):
    """Find the company on Groww by its trading symbol and use the logo Groww shows.

    Groww's newer logo files have random numbers in the name, so the URL cannot
    be guessed. Its own company data does carry the exact URL, so look it up.
    """
    base = _base(symbol)
    headers = {'User-Agent': 'Mozilla/5.0'}
    found = requests.get(
        'https://groww.in/v1/api/search/v1/entity',
        params={'app': 'false', 'page': 0, 'q': base, 'size': 5},
        headers=headers, timeout=8,
    ).json().get('content', [])
    # Only accept a result whose NSE/BSE code is exactly this symbol.
    match = next((
        e for e in found
        if e.get('entity_type') == 'Stocks'
        and base.upper() in (str(e.get('nse_scrip_code') or '').upper(), str(e.get('bse_scrip_code') or ''))
    ), None)
    if not match:
        return None
    company = requests.get(
        f'https://groww.in/v1/api/stocks_data/v1/company/search_id/{quote(match["search_id"], safe="")}',
        headers=headers, timeout=8,
    ).json()
    url = (company.get('header') or {}).get('logoUrl')
    return url if url and _image_ok(url) else None


def _website_icon(symbol):
    import yfinance as yf
    from PIL import Image
    site = (yf.Ticker(symbol).info or {}).get('website') or ''
    domain = urlparse(site if '//' in site else f'//{site}').netloc.replace('www.', '')
    if not domain:
        return None
    url = (
        'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON'
        f'&fallback_opts=TYPE,SIZE,URL&url=https://{domain}&size=256'
    )
    response = requests.get(url, timeout=8)
    if response.status_code != 200:
        return None
    width, height = Image.open(io.BytesIO(response.content)).size
    return url if min(width, height) >= MIN_ICON_SIZE else None


# Tried in this order; a source with no logo passes to the next one.
PROVIDERS = (_manual, _groww_cdn, _groww_search, _india_api, _website_icon)


def _find_logo(symbol):
    """Return a logo URL, '' when no source has one, None when sources were unreachable."""
    unreachable = 0
    for provider in PROVIDERS:
        try:
            url = provider(symbol)
        except Exception as exc:  # one failing source must not stop the others
            logger.warning('Logo source %s failed for %s: %s', provider.__name__, symbol, exc)
            unreachable += 1
            continue
        if url:
            return url
    return None if unreachable == len(PROVIDERS) else ''


def get_logo_urls(symbols):
    """Return {symbol: logo_url or None} for up to MAX_SYMBOLS symbols."""
    symbols = list(dict.fromkeys(s.strip() for s in symbols if s and s.strip()))[:MAX_SYMBOLS]
    result, unknown = {}, []
    for symbol in symbols:
        cached = cache.get(_cache_key(symbol))
        if cached is None:
            unknown.append(symbol)
        else:
            result[symbol] = cached or None

    if unknown:
        with ThreadPoolExecutor(max_workers=min(len(unknown), 8)) as pool:
            checks = list(pool.map(_find_logo, unknown))
        for symbol, found in zip(unknown, checks):
            if found is None:  # every source unreachable: do not cache, retry next time
                result[symbol] = None
                continue
            cache.set(_cache_key(symbol), found, FOUND_TTL if found else MISSING_TTL)
            result[symbol] = found or None
    return result
