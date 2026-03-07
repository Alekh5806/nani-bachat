"""
Celery tasks for portfolio app.
Handles scheduled stock price updates and daily snapshots.
"""
from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)


@shared_task
def update_all_stock_prices():
    """
    Update current prices for all active stock holdings.
    Runs every 5 minutes via Celery Beat.
    """
    from investments.models import Stock
    from portfolio.services import StockPriceService

    active_stocks = Stock.objects.filter(is_sold=False)
    symbols = list(active_stocks.values_list('symbol', flat=True).distinct())

    if not symbols:
        logger.info('No active stocks to update')
        return 'No stocks to update'

    prices = StockPriceService.get_multiple_prices(symbols)
    updated = 0

    for symbol, price_data in prices.items():
        if price_data and price_data.get('current_price', 0) > 0:
            count = active_stocks.filter(symbol=symbol).update(
                current_price=price_data['current_price'],
                last_price_update=timezone.now()
            )
            updated += count

    logger.info(f'Updated prices for {updated} stock entries')
    return f'Updated {updated} stock prices'


@shared_task
def update_single_stock_price(symbol: str):
    """Update price for a single stock symbol."""
    from investments.models import Stock
    from portfolio.services import StockPriceService

    price_data = StockPriceService.get_stock_price(symbol)
    if price_data and price_data.get('current_price', 0) > 0:
        Stock.objects.filter(symbol=symbol, is_sold=False).update(
            current_price=price_data['current_price'],
            last_price_update=timezone.now()
        )
        return f'Updated {symbol}: ₹{price_data["current_price"]}'
    return f'Failed to update {symbol}'


@shared_task
def save_daily_snapshot():
    """
    Save daily portfolio snapshot for growth chart.
    Runs daily at 4 PM IST (after market close).
    """
    from portfolio.models import PortfolioSnapshot
    from portfolio.services import PortfolioService
    from dividends.models import Dividend
    from django.db.models import Sum

    Member = get_user_model()
    today = timezone.now().date()

    portfolio = PortfolioService.get_portfolio_summary()
    total_dividends = Dividend.objects.aggregate(
        total=Sum('total_dividend')
    )['total'] or 0

    snapshot, created = PortfolioSnapshot.objects.update_or_create(
        date=today,
        defaults={
            'total_invested': portfolio['total_invested'],
            'total_current_value': portfolio['current_value'],
            'total_profit_loss': portfolio['profit_loss'],
            'profit_loss_percentage': portfolio['growth_percentage'],
            'total_dividends': float(total_dividends),
            'member_count': Member.objects.filter(is_active=True).count(),
        }
    )

    action = 'Created' if created else 'Updated'
    logger.info(f'{action} portfolio snapshot for {today}')
    return f'{action} snapshot for {today}: ₹{portfolio["current_value"]}'
