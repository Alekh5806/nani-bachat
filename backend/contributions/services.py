"""
Monthly pool settlement for PoolVest.

Each month one member is the "buyer" - the pool's cash is handed to them and
they place the actual share order from their demat account. The order total
almost never equals the pool total, so every month ends with one of:

  * Overspend  - shares cost more than was collected. The buyer covered the
                 gap from their own pocket. That advance is reimbursed by
                 reducing their next installment by the same amount, so over
                 the two months every member has still put in the same money
                 and ownership stays level.
  * Underspend - shares cost less than was collected. The buyer is physically
                 holding the leftover pool cash, so it is carried onto their
                 next month's bill. It is NOT credited as a new contribution,
                 because it was already counted in the month it was collected.
"""
from decimal import Decimal

from django.db import transaction

from .models import Contribution, MonthlyPool

ZERO = Decimal('0.00')


def next_month(month: str) -> str:
    """'2026-03' -> '2026-04'."""
    year, mon = (int(part) for part in month.split('-'))
    if mon == 12:
        return f'{year + 1}-01'
    return f'{year}-{mon + 1:02d}'


def previous_month(month: str) -> str:
    """'2026-03' -> '2026-02'."""
    year, mon = (int(part) for part in month.split('-'))
    if mon == 1:
        return f'{year - 1}-12'
    return f'{year}-{mon - 1:02d}'


class PoolSettlementService:
    """Reconciles what a month collected against what it actually spent."""

    # How far ahead a large advance may be spread, and cleared, in months.
    MAX_SPREAD_MONTHS = 24

    @staticmethod
    def resolve_buying_member(month: str):
        """
        The buyer is whoever's demat was used. Prefer the explicit pool setting,
        otherwise infer it from the stocks bought that month.
        """
        pool = MonthlyPool.objects.filter(month=month).first()
        if pool and pool.buying_member_id:
            return pool.buying_member

        from investments.models import Stock

        buyer_ids = list(
            Stock.objects.filter(buy_date__startswith=month, buyer__isnull=False)
            .values_list('buyer_id', flat=True)
            .distinct()
        )
        if len(buyer_ids) == 1:
            from accounts.models import Member
            return Member.objects.filter(pk=buyer_ids[0]).first()
        return None

    @staticmethod
    def get_month_status(month: str) -> dict:
        """Read-only view of a month's collected / spent / gap position."""
        pool, _ = MonthlyPool.objects.get_or_create(month=month)
        pool.total_invested = pool._month_purchase_cost()

        rows = Contribution.objects.filter(month=month)
        paid_rows = rows.filter(status='paid')

        base_collected = sum(
            (row.amount - row.buyer_topup for row in paid_rows), ZERO
        )
        collected = sum((row.amount for row in paid_rows), ZERO)
        expected = sum((row.amount for row in rows), ZERO)
        spent = pool.total_invested
        gap = spent - base_collected

        buyer = PoolSettlementService.resolve_buying_member(month)
        unpaid_count = rows.exclude(status='paid').count()

        return {
            'month': month,
            'buying_member': buyer.id if buyer else None,
            'buying_member_name': buyer.name if buyer else None,
            'total_expected': float(expected),
            'total_collected': float(collected),
            'base_collected': float(base_collected),
            'total_invested': float(spent),
            # Positive gap = buyer paid extra. Negative gap = buyer holds cash.
            'overspend': float(gap) if gap > 0 else 0.0,
            'underspend': float(-gap) if gap < 0 else 0.0,
            'difference': float(-gap),
            'next_installment': float(
                max(PoolSettlementService.default_base_amount(next_month(month)) - gap, ZERO)
            ) if gap > 0 else None,
            'unpaid_count': unpaid_count,
            'is_settled': pool.is_settled,
            'can_settle': buyer is not None and unpaid_count == 0,
        }

    @staticmethod
    @transaction.atomic
    def settle_month(month: str, buying_member=None, force: bool = False) -> dict:
        """
        Apply the collected-vs-spent difference to the buying member.

        Safe to run repeatedly: the top-up and carry-forward are recomputed from
        scratch each time rather than accumulated.
        """
        pool, _ = MonthlyPool.objects.get_or_create(month=month)

        if buying_member is not None:
            pool.buying_member = buying_member
            pool.save(update_fields=['buying_member'])

        buyer = buying_member or PoolSettlementService.resolve_buying_member(month)

        rows = Contribution.objects.filter(month=month)
        if not rows.exists():
            raise ValueError(f'No contributions exist for {month}.')

        if pool._month_purchase_cost() <= ZERO:
            raise ValueError(
                f'No share purchases recorded for {month}. Settling now would '
                f'treat the whole collection as unspent cash held by the buyer.'
            )

        if buyer is None:
            raise ValueError(
                f'No buying member set for {month}. Set one, or tag the buyer '
                f'on that month\'s stock purchases, before settling.'
            )

        unpaid_count = rows.exclude(status='paid').count()
        if unpaid_count and not force:
            raise ValueError(
                f'{unpaid_count} contribution(s) for {month} are still unpaid. '
                f'Settling now would blame the shortfall on the buyer. Collect '
                f'them first, or settle with force=true.'
            )

        buyer_row, _ = Contribution.objects.get_or_create(
            member=buyer,
            month=month,
            defaults={'amount': ZERO, 'base_amount': ZERO},
        )

        # Reset the buyer's row to its pre-settlement state so re-running is safe.
        buyer_row.buyer_topup = ZERO
        buyer_row.amount = max(buyer_row.base_amount - buyer_row.advance_credit, ZERO)
        buyer_row.save(update_fields=['amount', 'buyer_topup'])

        base_collected = sum(
            (row.amount - row.buyer_topup for row in rows.filter(status='paid')),
            ZERO,
        )
        spent = pool._month_purchase_cost()
        gap = spent - base_collected

        carry_month = next_month(month)
        overspend = ZERO
        underspend = ZERO

        if gap > 0:
            # Buyer fronted the excess; it is real cash in, reimbursed next month.
            overspend = gap
            buyer_row.buyer_topup = overspend
            buyer_row.amount = buyer_row.amount + overspend
            if buyer_row.status != 'paid':
                buyer_row.status = 'paid'
            buyer_row.save(update_fields=['amount', 'buyer_topup', 'status'])
        elif gap < 0:
            # Buyer is sitting on unspent pool cash -> bill it next month.
            underspend = -gap

        next_installment = PoolSettlementService._apply_buyer_adjustment(
            buyer, carry_month, advance=overspend, unspent=underspend
        )

        pool.is_settled = True
        pool.save(update_fields=['is_settled'])
        pool.update_totals()

        return {
            'month': month,
            'buying_member': buyer.id,
            'buying_member_name': buyer.name,
            'total_invested': float(spent),
            'base_collected': float(base_collected),
            'overspend': float(overspend),
            'underspend': float(underspend),
            'carry_forward_month': carry_month if (overspend or underspend) else None,
            'buyer_amount': float(buyer_row.amount),
            'buyer_next_installment': float(next_installment),
        }

    @staticmethod
    def _apply_buyer_adjustment(buyer, carry_month: str, advance: Decimal, unspent: Decimal):
        """
        Rewrite the buyer's upcoming rows.

        An advance reduces what they owe; if it exceeds one month's share the
        remainder rolls into the months after, so a large advance is never
        silently forfeited. Unspent pool cash they are holding is added on top.
        Everything is set rather than accumulated, so settling twice cannot
        double-count.
        """
        PoolSettlementService._clear_future_credits(buyer, carry_month)

        remaining = advance
        month = carry_month
        first_payable = None

        for _ in range(PoolSettlementService.MAX_SPREAD_MONTHS):
            row = Contribution.objects.filter(member=buyer, month=month).first()
            if row is None:
                base = PoolSettlementService.default_base_amount(month)
                row = Contribution(
                    member=buyer,
                    month=month,
                    base_amount=base,
                    status='unpaid',
                )

            row.advance_credit = min(remaining, row.base_amount)
            row.carry_forward = unspent if month == carry_month else ZERO
            row.amount = max(row.base_amount - row.advance_credit, ZERO)
            row.save()

            remaining -= row.advance_credit
            if first_payable is None:
                first_payable = row.payable_amount

            if remaining <= ZERO:
                break
            month = next_month(month)

        return first_payable if first_payable is not None else ZERO

    @staticmethod
    def _clear_future_credits(buyer, from_month: str):
        """
        Drop this buyer's later reimbursements before recomputing them.

        Settling a month rewrites the chain that follows it, so stale credits
        from a previous run must go first. Months are re-settled in date order,
        which puts back anything a later month is genuinely owed.
        """
        month = from_month
        for _ in range(PoolSettlementService.MAX_SPREAD_MONTHS):
            row = Contribution.objects.filter(member=buyer, month=month).first()
            if row is not None and (row.advance_credit or row.carry_forward):
                row.advance_credit = ZERO
                row.carry_forward = ZERO
                row.amount = row.base_amount
                row.save(update_fields=['advance_credit', 'carry_forward', 'amount'])
            month = next_month(month)

    @staticmethod
    def default_base_amount(month: str) -> Decimal:
        """Most common base amount already in use for a month, else ₹1000."""
        amounts = list(
            Contribution.objects.filter(month=month).values_list('base_amount', flat=True)
        )
        if amounts:
            return max(set(amounts), key=amounts.count)
        return Decimal('1000.00')

    @staticmethod
    def unsettled_months() -> list:
        """Months that have purchases but whose difference has not been applied."""
        from investments.models import Stock

        months = set(
            str(value)[:7]
            for value in Stock.objects.values_list('buy_date', flat=True)
        )
        settled = set(
            MonthlyPool.objects.filter(is_settled=True).values_list('month', flat=True)
        )
        return sorted(months - settled)

    @staticmethod
    def all_known_months() -> list:
        """Every month that has either a contribution or a share purchase."""
        from investments.models import Stock

        months = set(Contribution.objects.values_list('month', flat=True))
        months.update(
            str(value)[:7]
            for value in Stock.objects.values_list('buy_date', flat=True)
        )
        return sorted(month for month in months if month)

    @staticmethod
    def sync_pools() -> dict:
        """
        Make sure a MonthlyPool row exists for every known month and its totals
        match the underlying contributions and purchases.

        MonthlyPool is derived data, so this only ever creates rows and
        recalculates totals - it never touches contributions or stocks.
        """
        created, updated = [], []
        for month in PoolSettlementService.all_known_months():
            pool, was_created = MonthlyPool.objects.get_or_create(month=month)
            if pool.buying_member_id is None:
                buyer = PoolSettlementService.resolve_buying_member(month)
                if buyer is not None:
                    pool.buying_member = buyer
                    pool.save(update_fields=['buying_member'])
            pool.update_totals()
            (created if was_created else updated).append(month)
        return {'created': created, 'updated': updated}
