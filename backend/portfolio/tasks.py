"""
Celery tasks for portfolio app.
Handles scheduled stock price updates and daily snapshots.
"""
from celery import shared_task
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
    from portfolio.services import StockPriceService

    if StockPriceService.refresh_active_stock_prices([symbol]):
        return f'Updated {symbol}'
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
