"""
Monthly pool settlement for PoolVest.

Each month one member is the "buyer" - the pool's cash is handed to them and
they place the actual share order from their demat account.

The pool's cash is NOT just that month's contributions. It is:

    cash carried over from earlier months
  + this month's paid contributions
  + proceeds of any shares the pool sold this month

Sale proceeds belong to the pool, not to whoever happened to place the sell
order, so they are spent before anybody is asked for money out of pocket.
Ignoring them makes the buyer look like they funded a purchase the pool had
already funded, and then wrongly discounts their next installment.

Against that available cash, every month ends with one of:

  * Overspend  - shares cost more than the pool had. Only this true remainder
                 is the buyer's own money. That advance is reimbursed by
                 reducing their next installment by the same amount, so over
                 the two months every member has still put in the same money
                 and ownership stays level.
  * Underspend - shares cost less than the pool had. The leftover stays pool
                 money and rolls into the next month's available cash, so the
                 next buyer spends contributions plus that balance. It is never
                 billed to the member who happened to place the order: doing so
                 would move the pool's own cash onto one person's account, and
                 it is not a new contribution either, since it was already
                 counted in the month it was collected.
"""
from datetime import date
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

    # ── Pool cash ledger ─────────────────────────────────────────────────
    #
    # The pool is one continuous pot of money, so a month cannot be judged on
    # its own contributions alone. These helpers replay every cash movement in
    # the order it actually happened and hand back the position of the month
    # asked for.
    #
    # Order matters, not just the month. A sale on the 20th cannot pay for a
    # purchase made on the 12th - that money did not exist yet, so the buyer
    # really was out of pocket, and the proceeds stay in the pot for the next
    # purchase instead.

    # Same-day ordering: a month's contributions are treated as collected from
    # its first day, then money coming in, then money going out - so a sale can
    # fund a purchase made the same day, but never one made earlier.
    _CONTRIBUTIONS_IN = 0
    _SALE_IN = 1
    _PURCHASE_OUT = 2

    @staticmethod
    def _collected_by_month() -> dict:
        """
        New capital actually paid in, keyed by month.

        A buyer's top-up is stripped out: it is their own pocket money being
        recorded after the fact, not cash the pool had when the order was
        placed, so counting it would make every settled month look balanced.
        """
        collected = {}
        for row in Contribution.objects.filter(status='paid'):
            collected[row.month] = (
                collected.get(row.month, ZERO) + (row.amount - row.buyer_topup)
            )
        return collected

    @staticmethod
    def _cash_events() -> list:
        """
        Every dated movement of pool cash, oldest first.

        `amount` is signed - positive into the pool, negative out - and
        `member_id` is whose hands the money passes through: the demat a sale
        was made from, or the member who placed a purchase.
        """
        from investments.models import Stock

        events = []

        for month, amount in PoolSettlementService._collected_by_month().items():
            year, mon = (int(part) for part in month.split('-'))
            events.append({
                'date': date(year, mon, 1),
                'order': PoolSettlementService._CONTRIBUTIONS_IN,
                'month': month,
                'kind': 'contributions',
                'amount': amount,
                'member_id': None,
            })

        for stock in Stock.objects.all():
            cost = (stock.buy_price * stock.quantity) + stock.brokerage
            events.append({
                'date': stock.buy_date,
                'order': PoolSettlementService._PURCHASE_OUT,
                'month': stock.buy_date.strftime('%Y-%m'),
                'kind': 'purchase',
                'amount': -cost,
                'member_id': stock.buyer_id,
            })
            if stock.is_sold and stock.sell_date:
                events.append({
                    'date': stock.sell_date,
                    'order': PoolSettlementService._SALE_IN,
                    'month': stock.sell_date.strftime('%Y-%m'),
                    'kind': 'sale',
                    'amount': (stock.sell_price or ZERO) * stock.quantity,
                    'member_id': stock.buyer_id,
                })

        events.sort(key=lambda event: (event['date'], event['order']))
        return events

    @staticmethod
    def cash_position(month: str) -> dict:
        """
        What the pool could actually spend in `month`, and what was left after.

        Replays the whole history up to the end of `month`, carrying the balance
        forward so sale proceeds and leftovers stay in the pot until a purchase
        consumes them. The balance never goes negative: a purchase the pot
        cannot cover is topped up by the buyer on the spot.
        """
        balance = ZERO
        opening = None
        collected = ZERO
        proceeds = ZERO
        spent = ZERO
        # Proceeds that had actually landed by the time the month's last
        # purchase was placed. Anything later could not have funded it.
        usable_proceeds = ZERO
        seen_purchase = False

        for event in PoolSettlementService._cash_events():
            if event['month'] > month:
                break

            kind = event['kind']
            amount = event['amount']

            if event['month'] == month:
                if opening is None:
                    opening = balance
                if kind == 'contributions':
                    collected += amount
                elif kind == 'sale':
                    proceeds += amount
                else:
                    spent -= amount
                    usable_proceeds = proceeds
                    seen_purchase = True

            if kind == 'purchase':
                # The buyer covers whatever the pot is short, so it empties
                # rather than going negative.
                balance = max(balance + amount, ZERO)
            else:
                balance += amount

        if opening is None:
            opening = balance
        if not seen_purchase:
            # Nothing was bought, so nothing was racing the proceeds.
            usable_proceeds = proceeds

        available = opening + collected + usable_proceeds

        return {
            'month': month,
            'opening_cash': opening,
            'collected': collected,
            'sale_proceeds': proceeds,
            # Proceeds banked only after the buying was done. Real money, but
            # not money that month's purchase could have used.
            'late_sale_proceeds': proceeds - usable_proceeds,
            'available_cash': available,
            'spent': spent,
            'gap': spent - available,
            'closing_cash': balance,
        }

    # ── Cash custody ─────────────────────────────────────────────────────
    #
    # The pool has no bank account, so its spare cash is always sitting in some
    # member's own account: proceeds land in the demat the shares were sold
    # from, and whatever a buyer does not spend stays with them. Each month the
    # holders hand what they have to whoever is buying next, along with their
    # own contribution. These helpers say who owes that handover.

    @staticmethod
    def _replay_custody(month: str) -> tuple:
        """
        Who is holding pool cash when `month` comes to buy, and how much is
        collected but not yet in anybody's named hands.

        Stops just before that month's first purchase, because that is the
        moment the money has to have reached the buyer.
        """
        holders = {}
        # Contributions that have been paid but not yet handed to a buyer,
        # kept per month so an earlier month's stranded cash stays visible.
        pending = {}

        for event in PoolSettlementService._cash_events():
            if event['month'] > month:
                break
            if event['month'] == month and event['kind'] == 'purchase':
                break

            kind = event['kind']
            if kind == 'contributions':
                pending[event['month']] = pending.get(event['month'], ZERO) + event['amount']
            elif kind == 'sale':
                holder = event['member_id']
                holders[holder] = holders.get(holder, ZERO) + event['amount']
            else:
                # A purchase pulls every holder's cash, plus everything paid in
                # so far, to whoever placed the order. They keep the change; if
                # it fell short they covered the rest themselves and hold none.
                pot = sum(holders.values(), ZERO) + sum(pending.values(), ZERO)
                holders = {}
                pending = {}
                leftover = pot + event['amount']
                if leftover > ZERO:
                    holders[event['member_id']] = leftover

        holders = {member: amount for member, amount in holders.items() if amount > ZERO}
        carried_pending = sum(
            (amount for key, amount in pending.items() if key < month), ZERO
        )
        return holders, carried_pending

    @staticmethod
    def handover_plan(month: str) -> dict:
        """
        Exactly who sends what to this month's buyer.

        Each member hands over their own contribution plus any pool cash they
        are still holding. None of it is a charge: the holdings are the pool's
        money changing hands, so they never touch a member's contribution total
        or their ownership share.
        """
        from accounts.models import Member

        holders, carried_pending = PoolSettlementService._replay_custody(month)
        buyer = PoolSettlementService.resolve_buying_member(month)

        rows = Contribution.objects.filter(month=month).select_related('member')
        by_member = {row.member_id: row for row in rows}

        # Anyone holding pool cash has to send it even if they have no
        # contribution row this month, so include them too.
        member_ids = set(by_member) | set(holders)
        members = {m.id: m for m in Member.objects.filter(pk__in=member_ids)}

        transfers = []
        buyer_keeps = None
        expected = ZERO
        available = ZERO

        for member_id in member_ids:
            member = members.get(member_id)
            if member is None:
                continue
            row = by_member.get(member_id)
            contribution = row.payable_amount if row else ZERO
            holding = holders.get(member_id, ZERO)
            status = row.status if row else 'none'

            entry = {
                'member': member_id,
                'member_name': member.name,
                'contribution': float(contribution),
                'holding': float(holding),
                'total': float(contribution + holding),
                'status': status,
            }
            expected += contribution + holding
            if status == 'paid':
                available += (row.amount - row.buyer_topup) + holding
            else:
                available += holding

            if buyer is not None and member_id == buyer.id:
                buyer_keeps = entry
            else:
                transfers.append(entry)

        # Largest handover first: that is the one worth chasing.
        transfers.sort(key=lambda entry: (-entry['total'], entry['member_name']))

        return {
            'month': month,
            'buying_member': buyer.id if buyer else None,
            'buying_member_name': buyer.name if buyer else None,
            'transfers': transfers,
            'buyer_keeps': buyer_keeps,
            'pool_cash_in_hands': float(sum(holders.values(), ZERO)),
            # Paid in during an earlier month that never bought anything, so no
            # single member is recorded as holding it.
            'unassigned_cash': float(carried_pending),
            'expected_to_buyer': float(expected + carried_pending),
            'available_cash': float(available + carried_pending),
        }

    @staticmethod
    def get_month_status(month: str) -> dict:
        """Read-only view of a month's collected / spent / gap position."""
        pool, _ = MonthlyPool.objects.get_or_create(month=month)
        pool.total_invested = pool._month_purchase_cost()

        rows = Contribution.objects.filter(month=month)
        paid_rows = rows.filter(status='paid')

        collected = sum((row.amount for row in paid_rows), ZERO)
        expected = sum((row.amount for row in rows), ZERO)

        # The gap is measured against every rupee the pool could spend, not
        # just this month's collection, so sale proceeds and carried-over cash
        # are consumed before the buyer is said to be out of pocket.
        position = PoolSettlementService.cash_position(month)
        base_collected = position['collected']
        spent = position['spent']
        gap = position['gap']

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
            # Every source the month's purchase could draw on.
            'opening_cash': float(position['opening_cash']),
            'sale_proceeds': float(position['sale_proceeds']),
            'late_sale_proceeds': float(position['late_sale_proceeds']),
            'available_cash': float(position['available_cash']),
            'closing_cash': float(position['closing_cash']),
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

        # Recomputed after the reset above, so a re-settle measures the month
        # from its pre-settlement state. Sale proceeds and cash carried in from
        # earlier months count as pool money: they are spent before any of the
        # cost is treated as the buyer's own.
        position = PoolSettlementService.cash_position(month)
        base_collected = position['collected']
        available = position['available_cash']
        spent = position['spent']
        gap = position['gap']

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
            # Leftover pool money. It is NOT billed to the buyer: it simply
            # stays in the pot and funds the next month's purchase, whoever
            # places that order. Charging it to the buyer would take the pool's
            # own cash out of the pool and put it on one member's bill.
            underspend = -gap

        next_installment = PoolSettlementService._apply_buyer_adjustment(
            buyer, carry_month, advance=overspend
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
            'opening_cash': float(position['opening_cash']),
            'sale_proceeds': float(position['sale_proceeds']),
            'late_sale_proceeds': float(position['late_sale_proceeds']),
            'available_cash': float(available),
            'closing_cash': float(position['closing_cash']),
            'overspend': float(overspend),
            'underspend': float(underspend),
            # Leftover is pool cash, so it is reported as the balance rolling
            # into the next month rather than as something the buyer owes.
            'pool_cash_carried': float(underspend),
            'carry_forward_month': carry_month if (overspend or underspend) else None,
            'buyer_amount': float(buyer_row.amount),
            'buyer_next_installment': float(next_installment),
        }

    @staticmethod
    def _apply_buyer_adjustment(buyer, carry_month: str, advance: Decimal):
        """
        Rewrite the buyer's upcoming rows to reimburse an advance.

        An advance reduces what they owe; if it exceeds one month's share the
        remainder rolls into the months after, so a large advance is never
        silently forfeited. Everything is set rather than accumulated, so
        settling twice cannot double-count.

        Only money the buyer paid from their own pocket lands here. Unspent
        pool cash is deliberately absent: it belongs to the pool, not to them.
        """
        PoolSettlementService._clear_future_credits(buyer, carry_month)

        if advance <= ZERO:
            # Nothing to reimburse. Stop here rather than walking forward, or a
            # clean month would conjure a contribution row for a month the admin
            # has not generated yet.
            row = Contribution.objects.filter(member=buyer, month=carry_month).first()
            return row.payable_amount if row else ZERO

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
            row.carry_forward = ZERO
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
