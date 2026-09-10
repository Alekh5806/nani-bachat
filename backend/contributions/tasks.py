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
    from decimal import Decimal

    from .models import Contribution, MonthlyPool
    from .services import PoolSettlementService, previous_month

    month = timezone.now().strftime('%Y-%m')
    members = Member.objects.filter(is_active=True)
    created_count = 0

    # Bill last month's buyer for any pool cash they are still holding.
    carried = {}
    prior_status = PoolSettlementService.get_month_status(previous_month(month))
    if prior_status['is_settled'] and prior_status['underspend'] > 0 and prior_status['buying_member']:
        carried[prior_status['buying_member']] = Decimal(str(prior_status['underspend']))

    for member in members:
        _, created = Contribution.objects.get_or_create(
            member=member,
            month=month,
            defaults={
                'amount': Decimal('1000.00'),
                'base_amount': Decimal('1000.00'),
                'carry_forward': carried.get(member.id, Decimal('0.00')),
                'status': 'unpaid',
            }
        )
        if created:
            created_count += 1

    pool, _ = MonthlyPool.objects.get_or_create(month=month)
    pool.update_totals()

    logger.info(f'Generated {created_count} contribution records for {month}')
    return f'Generated {created_count} records for {month}'
