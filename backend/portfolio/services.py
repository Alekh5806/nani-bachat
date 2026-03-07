"""
Stock price service for PoolVest.
Fetches real-time stock prices from Yahoo Finance.
Supports NSE stocks with .NS suffix.
"""
import logging
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# Cache timeout: 5 minutes (300 seconds)
PRICE_CACHE_TIMEOUT = 300


class StockPriceService:
    """Service to fetch and cache stock prices from Yahoo Finance."""

    @staticmethod
    def get_stock_price(symbol: str) -> dict:
        """
        Fetch current stock price for a given symbol.
        Results are cached for 5 minutes.
        """
        cache_key = f'stock_price_{symbol}'
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            info = ticker.info
            price_data = {
                'symbol': symbol,
                'current_price': info.get('currentPrice') or info.get('regularMarketPrice', 0),
                'previous_close': info.get('previousClose', 0),
                'day_change': info.get('regularMarketChange', 0),
                'day_change_pct': info.get('regularMarketChangePercent', 0),
                'name': info.get('shortName', symbol),
            }
            cache.set(cache_key, price_data, PRICE_CACHE_TIMEOUT)
            return price_data
        except Exception as e:
            logger.error(f'Failed to fetch price for {symbol}: {e}')
            return None

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
            cache.set(cache_key, data, PRICE_CACHE_TIMEOUT * 6)  # Cache for 30 min
            return data
        except Exception as e:
            logger.error(f'Failed to fetch history for {symbol}: {e}')
            return []


class PortfolioService:
    """Service for portfolio-level calculations."""

    @staticmethod
    def get_portfolio_summary() -> dict:
        """Calculate complete portfolio summary with live prices."""
        from investments.models import Stock
        from dividends.models import Dividend
        from django.db.models import Sum

        active_stocks = Stock.objects.filter(is_sold=False)

        total_invested = 0
        total_current_value = 0

        # Get unique symbols and fetch live prices
        symbols = active_stocks.values_list('symbol', flat=True).distinct()
        live_prices = {}
        for symbol in symbols:
            price_data = StockPriceService.get_stock_price(symbol)
            if price_data and price_data.get('current_price', 0) > 0:
                live_prices[symbol] = price_data['current_price']

        for s in active_stocks:
            invested = float(s.buy_price * s.quantity) + float(s.brokerage)
            total_invested += invested

            # Use live price if available, otherwise use stored current_price
            price = live_prices.get(s.symbol, float(s.current_price))
            total_current_value += price * s.quantity

        total_profit_loss = total_current_value - total_invested
        growth_percentage = (
            (total_profit_loss / total_invested * 100)
            if total_invested > 0 else 0
        )

        total_dividends = Dividend.objects.aggregate(
            total=Sum('total_dividend')
        )['total'] or 0

        return {
            'total_invested': round(total_invested, 2),
            'current_value': round(total_current_value, 2),
            'profit_loss': round(total_profit_loss, 2),
            'growth_percentage': round(growth_percentage, 2),
            'total_dividends': float(total_dividends),
            'total_returns': round(total_profit_loss + float(total_dividends), 2),
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

        # Calculate percentages
        for item in allocation:
            item['percentage'] = round(
                (item['value'] / total_value * 100) if total_value > 0 else 0, 2
            )

        allocation.sort(key=lambda x: x['value'], reverse=True)
        return allocation
