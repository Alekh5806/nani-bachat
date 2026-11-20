"""Replay settled months affected by fractional buyer advances."""
from django.core.management.base import BaseCommand
from django.db import transaction

from contributions.models import Contribution, MonthlyPool
from contributions.services import PoolSettlementService


class Command(BaseCommand):
    help = 'Recalculate settled buyer advances in date order. Preview by default.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Commit the corrections.')

    @transaction.atomic
    def handle(self, *args, **options):
        settled = MonthlyPool.objects.filter(is_settled=True).values('month')
        paid = Contribution.objects.filter(month__in=settled, buyer_topup__gt=0)
        advances = dict(paid.order_by('month').values_list('month', 'buyer_topup'))
        first = next((month for month, value in advances.items() if value % 1), None)
        if first is None:
            self.stdout.write('No fractional buyer advances to repair.')
            return

        for result in PoolSettlementService.replay_settled_months(first):
            month = result['month']
            self.stdout.write(f'{month}  {advances.get(month, 0):.2f} -> {result["overspend"]:.0f}')
        if options['apply']:
            self.stdout.write('Applied buyer advance corrections.')
        else:
            transaction.set_rollback(True)
            self.stdout.write('Preview only. Changes rolled back.')
