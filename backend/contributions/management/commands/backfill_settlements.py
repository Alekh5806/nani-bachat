"""Bring historical months up to date: align baselines, build pools, settle gaps."""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from contributions.models import Contribution
from contributions.services import PoolSettlementService


class Rollback(Exception):
    """Raised to abort the transaction after a dry run."""


class Command(BaseCommand):
    help = (
        'Sets base_amount from the amount already recorded, creates the missing '
        'MonthlyPool rows, then settles every month that has share purchases, in '
        'date order so carry-forward chains correctly. Previews by default; pass '
        '--apply to write.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Actually write the changes. Without this nothing is saved.',
        )
        parser.add_argument(
            '--base-amount',
            default='1000',
            help=(
                'The standard monthly share every member owes before any buyer '
                'adjustment. Written to base_amount on all rows. Default 1000.'
            ),
        )
        parser.add_argument(
            '--skip-base-sync',
            action='store_true',
            help='Leave base_amount untouched (use if you already fixed it).',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Settle even if some contributions are still unpaid.',
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']

        try:
            with transaction.atomic():
                self._run(options)
                if not apply_changes:
                    raise Rollback
        except Rollback:
            self.stdout.write(
                self.style.WARNING(
                    '\nDRY RUN - nothing was saved. Re-run with --apply to commit.'
                )
            )
            return

        self.stdout.write(self.style.SUCCESS('\nDone. Changes committed.'))

    def _run(self, options):
        if not options['skip_base_sync']:
            base = Decimal(str(options['base_amount']))
            updated = Contribution.objects.exclude(base_amount=base).count()
            Contribution.objects.update(base_amount=base)
            self.stdout.write(
                f'1. base_amount set to {base} on {updated} row(s).'
            )
        else:
            self.stdout.write('1. base_amount sync skipped.')
        result = PoolSettlementService.sync_pools()
        self.stdout.write(
            f'2. pools synced: {len(result["created"])} created, '
            f'{len(result["updated"])} refreshed.'
        )

        self.stdout.write('3. settling months with purchases:')
        for month in PoolSettlementService.all_known_months():
            try:
                outcome = PoolSettlementService.settle_month(
                    month, force=options['force']
                )
            except ValueError as exc:
                self.stdout.write(f'   {month}  skipped - {exc}')
                continue

            if outcome['overspend']:
                detail = (
                    f'{outcome["buying_member_name"]} advanced '
                    f'+{outcome["overspend"]:.2f} -> next installment '
                    f'{outcome["buyer_next_installment"]:.2f}'
                )
            elif outcome['underspend']:
                detail = (
                    f'{outcome["buying_member_name"]} holds '
                    f'{outcome["underspend"]:.2f} (billed next month)'
                )
            else:
                detail = 'exact match'
            self.stdout.write(self.style.SUCCESS(f'   {month}  {detail}'))
