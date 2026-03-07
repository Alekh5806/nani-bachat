"""
Celery configuration for PoolVest.
Handles scheduled stock price updates every 5 minutes during market hours.
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'poolvest.settings')

app = Celery('poolvest')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ──────────────────────────────────────────────
# PERIODIC TASKS
# ──────────────────────────────────────────────
app.conf.beat_schedule = {
    # Update stock prices every 5 minutes during IST market hours (9:15 AM - 3:30 PM)
    'update-stock-prices': {
        'task': 'portfolio.tasks.update_all_stock_prices',
        'schedule': 300.0,  # Every 5 minutes (300 seconds)
    },
    # Generate monthly contributions on 1st of each month
    'generate-monthly-contributions': {
        'task': 'contributions.tasks.generate_monthly_contributions',
        'schedule': crontab(hour=0, minute=0, day_of_month=1),
    },
    # Daily portfolio snapshot at 4 PM IST (after market close)
    'daily-portfolio-snapshot': {
        'task': 'portfolio.tasks.save_daily_snapshot',
        'schedule': crontab(hour=16, minute=0),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery."""
    print(f'Request: {self.request!r}')
