"""
Celery tasks for portfolio app.
Handles scheduled stock price updates and daily snapshots.
"""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task
def update_all_stock_prices():
    """
    Update current prices for all active stock holdings.
    Runs every 5 minutes via Celery Beat.
    """
    from portfolio.services import StockPriceService

    updated = StockPriceService.refresh_active_stock_prices()
    if updated == 0:
        logger.info('No active stocks to update')

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
    from portfolio.services import PortfolioService
    snapshot, created = PortfolioService.save_current_snapshot()

    action = 'Created' if created else 'Updated'
    logger.info(f'{action} portfolio snapshot for {snapshot.date}')
    return f'{action} snapshot for {snapshot.date}: ₹{snapshot.total_current_value}'
