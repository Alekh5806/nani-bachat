"""
Celery tasks for contributions app.
Auto-generates monthly contribution records.
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
Member = get_user_model()


@shared_task
def generate_monthly_contributions():
    """
    Auto-generate contribution records for the current month.
    Runs on the 1st of each month via Celery Beat.
    """
    from .models import Contribution, MonthlyPool

    month = timezone.now().strftime('%Y-%m')
    members = Member.objects.filter(is_active=True)
    created_count = 0

    for member in members:
        _, created = Contribution.objects.get_or_create(
            member=member,
            month=month,
            defaults={'amount': 1000, 'status': 'unpaid'}
        )
        if created:
            created_count += 1

    pool, _ = MonthlyPool.objects.get_or_create(
        month=month,
        defaults={'total_expected': members.count() * 1000}
    )
    pool.update_totals()

    logger.info(f'Generated {created_count} contribution records for {month}')
    return f'Generated {created_count} records for {month}'
