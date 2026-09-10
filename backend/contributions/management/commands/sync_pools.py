"""Create/refresh MonthlyPool rows from existing contributions and purchases."""
from django.core.management.base import BaseCommand

from contributions.services import PoolSettlementService


class Command(BaseCommand):
    help = (
        'Ensures a MonthlyPool row exists for every month that has contributions '
        'or share purchases, and recalculates its totals. Only creates pool rows '
        'and recomputes derived totals - contributions and stocks are untouched.'
    )

    def handle(self, *args, **options):
        result = PoolSettlementService.sync_pools()

        for month in result['created']:
            self.stdout.write(self.style.SUCCESS(f'  created  {month}'))
        for month in result['updated']:
            self.stdout.write(f'  refreshed {month}')

        total = len(result['created']) + len(result['updated'])
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{total} pool(s) synced ({len(result["created"])} created).'
            )
        )
