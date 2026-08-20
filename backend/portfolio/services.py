"""
Stock price service for PoolVest.
Fetches real-time stock prices from Yahoo Finance.
Supports NSE stocks with .NS suffix.
"""
import logging
from decimal import Decimal
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# Cache live quotes briefly so the app can feel current without hammering Yahoo.
PRICE_CACHE_TIMEOUT = 60
HISTORY_CACHE_TIMEOUT = 1800


class StockPriceService:
    """Service to fetch and cache stock prices from Yahoo Finance."""

    @staticmethod
    def _build_price_data(symbol: str, current_price, previous_close, name: str = None) -> dict:
        current_price = StockPriceService._to_float(current_price)
        previous_close = StockPriceService._to_float(previous_close)

        if current_price <= 0:
            return None

        day_change = current_price - previous_close if previous_close > 0 else 0
        day_change_pct = (day_change / previous_close * 100) if previous_close > 0 else 0

        return {
            'symbol': symbol,
            'current_price': round(current_price, 2),
            'previous_close': round(previous_close, 2),
            'day_change': round(day_change, 2),
            'day_change_pct': round(day_change_pct, 2),
            'day_change_percentage': round(day_change_pct, 2),
            'name': name or symbol,
        }

    @staticmethod
    def _fast_info_value(fast_info, key: str, default=0):
        """Read yfinance fast_info values across object/dict implementations."""
        try:
            value = getattr(fast_info, key)
        except Exception:
            try:
                value = fast_info.get(key, default)
            except Exception:
                value = default

        return value if value is not None else default

    @staticmethod
    def _to_float(value, default=0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _get_yahoo_chart_price(symbol: str) -> dict:
        """Fetch quote data from Yahoo's chart endpoint without yfinance wrappers."""
        try:
            import requests

            response = requests.get(
                f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}',
                params={'range': '1d', 'interval': '1m'},
                headers={'User-Agent': 'Mozilla/5.0'},
                timeout=15,
            )
            response.raise_for_status()

            payload = response.json()
            result = (payload.get('chart', {}).get('result') or [None])[0]
            if not result:
                return None

            meta = result.get('meta', {})
            current_price = (
                meta.get('regularMarketPrice')
                or meta.get('postMarketPrice')
                or meta.get('preMarketPrice')
            )
            previous_close = meta.get('previousClose') or meta.get('chartPreviousClose')

            return StockPriceService._build_price_data(
                symbol,
                current_price,
                previous_close,
                meta.get('shortName') or meta.get('longName'),
            )
        except Exception as e:
            logger.warning(f'Yahoo chart price fetch failed for {symbol}: {e}')
            return None

    @staticmethod
    def get_stock_price(symbol: str) -> dict:
        """
        Fetch current stock price for a given symbol.
        Results are cached briefly.
        """
        cache_key = f'stock_price_{symbol}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        price_data = StockPriceService._get_yahoo_chart_price(symbol)
        if price_data:
            cache.set(cache_key, price_data, PRICE_CACHE_TIMEOUT)
            return price_data

        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)

            fast_info = ticker.fast_info
            current_price = StockPriceService._to_float(
                StockPriceService._fast_info_value(fast_info, 'last_price')
            )
            previous_close = StockPriceService._to_float(
                StockPriceService._fast_info_value(fast_info, 'previous_close')
            )

            if current_price <= 0:
                hist = ticker.history(period='5d')
                if not hist.empty:
                    current_price = StockPriceService._to_float(hist['Close'].iloc[-1])
                    if len(hist) > 1:
                        previous_close = StockPriceService._to_float(hist['Close'].iloc[-2])

            if current_price <= 0:
                info = ticker.info
                current_price = StockPriceService._to_float(
                    info.get('currentPrice') or info.get('regularMarketPrice')
                )
                previous_close = StockPriceService._to_float(info.get('previousClose'))

            if current_price <= 0:
                logger.warning(f'No usable price returned for {symbol}')
                return None

            price_data = StockPriceService._build_price_data(
                symbol,
                current_price,
                previous_close,
            )
            cache.set(cache_key, price_data, PRICE_CACHE_TIMEOUT)
            return price_data
        except Exception as e:
            logger.error(f'Failed to fetch price for {symbol}: {e}')
            return None

    @staticmethod
    def refresh_active_stock_prices(symbols: list = None) -> int:
        """
        Refresh and persist latest prices for active holdings.
        This is safe to call from API requests, so production does not depend
        on a separate Celery Beat process for price updates.
        """
        from investments.models import Stock

        active_stocks = Stock.objects.filter(is_sold=False)
        if symbols is None:
            symbols = list(active_stocks.values_list('symbol', flat=True).distinct())

        updated = 0
        for symbol in symbols:
            price_data = StockPriceService.get_stock_price(symbol)
            current_price = price_data.get('current_price') if price_data else None
            if current_price and current_price > 0:
                count = active_stocks.filter(symbol=symbol).update(
                    current_price=Decimal(str(round(float(current_price), 2))),
                    last_price_update=timezone.now()
                )
                updated += count

        return updated

    @staticmethod
    def get_multiple_prices(symbols: list) -> dict:
        """Fetch prices for multiple symbols at once."""
        results = {}
        for symbol in symbols:
            results[symbol] = StockPriceService.get_stock_price(symbol)
        return results

    @staticmethod
    def get_stock_history(symbol: str, period: str = '1y') -> list:
        """Fetch historical price data for charts."""
        cache_key = f'stock_history_{symbol}_{period}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period=period)
            data = [
                {'date': str(date.date()), 'close': round(row['Close'], 2)}
                for date, row in hist.iterrows()
            ]
            cache.set(cache_key, data, HISTORY_CACHE_TIMEOUT)
            return data
        except Exception as e:
            logger.error(f'Failed to fetch history for {symbol}: {e}')
            return []


class PortfolioService:
    """Service for portfolio-level calculations."""

    @staticmethod
    def _money(value) -> Decimal:
        """Convert database/numeric values to Decimal without float drift."""
        return Decimal(str(value or 0))

    @staticmethod
    def get_portfolio_summary() -> dict:
        """Calculate complete portfolio summary, including cash from realized sales."""
        from investments.models import Stock
        from dividends.models import Dividend
        from contributions.models import Contribution
        from django.db.models import Sum

        active_stocks = Stock.objects.filter(is_sold=False)
        sold_stocks = Stock.objects.filter(is_sold=True)

        active_stock_invested = Decimal('0.00')
        active_stock_value = Decimal('0.00')
        sold_stock_invested = Decimal('0.00')
        realized_sale_value = Decimal('0.00')

        # Get unique symbols and fetch live prices
        symbols = active_stocks.values_list('symbol', flat=True).distinct()
        live_prices = {}
        for symbol in symbols:
            price_data = StockPriceService.get_stock_price(symbol)
            if price_data and price_data.get('current_price', 0) > 0:
                live_prices[symbol] = PortfolioService._money(price_data['current_price'])

        for s in active_stocks:
            invested = (s.buy_price * s.quantity) + s.brokerage
            active_stock_invested += invested

            # Use live price if available, otherwise use stored current_price
            price = live_prices.get(s.symbol, s.current_price)
            active_stock_value += price * s.quantity

        for s in sold_stocks:
            sold_stock_invested += (s.buy_price * s.quantity) + s.brokerage
            realized_sale_value += (s.sell_price or Decimal('0.00')) * s.quantity

        total_dividends = Dividend.objects.aggregate(
            total=Sum('total_dividend')
        )['total'] or Decimal('0.00')

        total_contributions = Contribution.objects.filter(
            status='paid'
        ).aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')

        stock_purchase_cost = active_stock_invested + sold_stock_invested
        capital_basis = total_contributions if total_contributions > 0 else stock_purchase_cost
        cash_balance = capital_basis + realized_sale_value - stock_purchase_cost
        total_current_value = active_stock_value + cash_balance + total_dividends
        realized_profit_loss = realized_sale_value - sold_stock_invested
        unrealized_profit_loss = active_stock_value - active_stock_invested
        total_profit_loss = total_current_value - capital_basis

        growth_percentage = (
            (total_profit_loss / capital_basis * 100)
            if capital_basis > 0 else 0
        )

        return {
            'total_invested': round(float(capital_basis), 2),
            'current_value': round(float(total_current_value), 2),
            'profit_loss': round(float(total_profit_loss), 2),
            'growth_percentage': round(float(growth_percentage), 2),
            'total_dividends': float(total_dividends),
            'total_returns': round(float(total_profit_loss), 2),
            'cash_balance': round(float(cash_balance), 2),
            'active_stock_value': round(float(active_stock_value), 2),
            'active_stock_invested': round(float(active_stock_invested), 2),
            'stock_purchase_cost': round(float(stock_purchase_cost), 2),
            'realized_sale_value': round(float(realized_sale_value), 2),
            'realized_profit_loss': round(float(realized_profit_loss), 2),
            'unrealized_profit_loss': round(float(unrealized_profit_loss), 2),
        }

    @staticmethod
    def get_member_portfolio(member) -> dict:
        """
        Calculate portfolio details for a specific member.
        Falls back to equal split if no paid contributions exist.
        """
        portfolio = PortfolioService.get_portfolio_summary()
        ownership = float(member.ownership_percentage) / 100

        # Fallback: if ownership is 0 but there are active members,
        # assume equal split among all active members
        if ownership == 0:
            from django.contrib.auth import get_user_model
            MemberModel = get_user_model()
            active_count = MemberModel.objects.filter(is_active=True).count()
            if active_count > 0:
                ownership = 1.0 / active_count

        current_value = round(portfolio['current_value'] * ownership, 2)
        invested = float(member.total_contribution)
        # If no paid contributions yet, use equal split of total invested
        if invested == 0 and ownership > 0:
            invested = round(portfolio['total_invested'] * ownership, 2)
        profit_loss = round(current_value - invested, 2)
        dividend_earned = round(portfolio['total_dividends'] * ownership, 2)

        return {
            'member_id': member.id,
            'name': member.name,
            'phone': member.phone,
            'role': member.role,
            'total_contribution': invested,
            'ownership_percentage': round(ownership * 100, 2),
            'current_value': current_value,
            'profit_loss': profit_loss,
            'dividend_earned': dividend_earned,
        }

    @staticmethod
    def get_allocation_data() -> list:
        """Get stock allocation for pie chart."""
        from investments.models import Stock

        active_stocks = Stock.objects.filter(is_sold=False)
        symbols = active_stocks.values_list('symbol', flat=True).distinct()

        allocation = []
        total_value = 0

        for symbol in symbols:
            stocks = active_stocks.filter(symbol=symbol)
            first = stocks.first()
            qty = sum(s.quantity for s in stocks)
            value = float(first.current_price) * qty
            total_value += value
            allocation.append({
                'symbol': symbol,
                'name': first.name,
                'value': round(value, 2),
                'quantity': qty,
            })

        cash_balance = PortfolioService.get_portfolio_summary().get('cash_balance', 0)
        if cash_balance > 0:
            total_value += cash_balance
            allocation.append({
                'symbol': 'CASH',
                'name': 'Pool Cash',
                'value': round(cash_balance, 2),
                'quantity': None,
            })

        # Calculate percentages
        for item in allocation:
            item['percentage'] = round(
                (item['value'] / total_value * 100) if total_value > 0 else 0, 2
            )

        allocation.sort(key=lambda x: x['value'], reverse=True)
        return allocation
