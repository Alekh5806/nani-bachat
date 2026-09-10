"""
Settlement tests, focused on the pool being one continuous pot of cash.

The bug these guard against: a month's purchase was compared only against that
month's contributions, so money the pool already had - proceeds of shares it
sold, or cash left over from an earlier month - was invisible. The buyer was
credited with paying it out of their own pocket and their next installment was
wrongly discounted by that amount.
"""
from datetime import date
from decimal import Decimal

from django.test import TestCase

from accounts.models import Member
from contributions.models import Contribution, MonthlyPool
from contributions.services import PoolSettlementService
from investments.models import Stock


class PoolCashLedgerTests(TestCase):
    """Sale proceeds and leftovers must be spent before the buyer's pocket is."""

    def setUp(self):
        self.buyer = Member.objects.create_user(
            phone='9000000001', name='Buyer', password='x'
        )
        self.other = Member.objects.create_user(
            phone='9000000002', name='Other', password='x'
        )

    def _contribute(self, month, amount='1000.00', status='paid', amounts=None):
        """Both members pay `amount`, or `amounts` when they differ."""
        shares = amounts or (amount, amount)
        for member, share in zip((self.buyer, self.other), shares):
            Contribution.objects.create(
                member=member,
                month=month,
                amount=Decimal(share),
                base_amount=Decimal(share),
                status=status,
            )

    def _buy(self, month_day, price, quantity=1, brokerage='0.00'):
        return Stock.objects.create(
            symbol='TCS.NS', name='TCS', quantity=quantity,
            buy_price=Decimal(price), brokerage=Decimal(brokerage),
            buy_date=month_day, buyer=self.buyer,
        )

    def _sell(self, stock, sell_day, price):
        stock.is_sold = True
        stock.sell_price = Decimal(price)
        stock.sell_date = sell_day
        stock.save()
        return stock

    def test_sale_proceeds_fund_the_purchase_before_the_buyer_does(self):
        """A sale in the same month is pool cash, not the buyer's own money."""
        self._contribute('2026-09')
        sold = self._buy(date(2026, 8, 10), '500.00', quantity=2)
        self._sell(sold, date(2026, 9, 1), '600.00')  # +1200 into the pool
        self._buy(date(2026, 9, 15), '2800.00')       # costs 2800

        status = PoolSettlementService.get_month_status('2026-09')

        # 2000 contributed + 1200 realised = 3200 available against 2800 spent.
        self.assertEqual(status['sale_proceeds'], 1200.0)
        self.assertEqual(status['available_cash'], 3200.0)
        self.assertEqual(status['overspend'], 0.0)
        self.assertEqual(status['underspend'], 400.0)

    def test_only_the_true_shortfall_is_charged_to_the_buyer(self):
        """Proceeds shrink the gap; whatever is still missing stays the buyer's."""
        self._contribute('2026-09')
        sold = self._buy(date(2026, 8, 10), '500.00', quantity=2)
        self._sell(sold, date(2026, 9, 1), '600.00')  # +1200
        self._buy(date(2026, 9, 15), '3500.00')       # 300 short of 3200

        result = PoolSettlementService.settle_month('2026-09', buying_member=self.buyer)

        self.assertEqual(result['overspend'], 300.0)
        buyer_row = Contribution.objects.get(member=self.buyer, month='2026-09')
        self.assertEqual(buyer_row.buyer_topup, Decimal('300.00'))

    def test_next_installment_is_reduced_only_by_the_real_advance(self):
        """The reimbursement must not include money the pool itself supplied."""
        self._contribute('2026-09')
        sold = self._buy(date(2026, 8, 10), '500.00', quantity=2)
        self._sell(sold, date(2026, 9, 1), '600.00')
        self._buy(date(2026, 9, 15), '3500.00')

        PoolSettlementService.settle_month('2026-09', buying_member=self.buyer)

        next_row = Contribution.objects.get(member=self.buyer, month='2026-10')
        self.assertEqual(next_row.advance_credit, Decimal('300.00'))
        self.assertEqual(next_row.amount, Decimal('700.00'))

    def test_unspent_cash_stays_available_to_the_following_month(self):
        """Leftover pool cash funds the next purchase instead of vanishing."""
        self._contribute('2026-09')
        self._buy(date(2026, 9, 15), '1500.00')   # 500 left over
        self._contribute('2026-10')
        self._buy(date(2026, 10, 15), '2400.00')  # 2000 + 500 carried = 2500

        october = PoolSettlementService.get_month_status('2026-10')

        self.assertEqual(october['opening_cash'], 500.0)
        self.assertEqual(october['available_cash'], 2500.0)
        self.assertEqual(october['overspend'], 0.0)

    def test_leftover_is_never_billed_to_the_buyer(self):
        """Unspent pool money is the pool's, so nobody's installment changes."""
        self._contribute('2026-09')
        self._buy(date(2026, 9, 15), '1500.00')  # 500 left in the pot
        self._contribute('2026-10')

        result = PoolSettlementService.settle_month('2026-09', buying_member=self.buyer)

        self.assertEqual(result['underspend'], 500.0)
        self.assertEqual(result['pool_cash_carried'], 500.0)
        next_row = Contribution.objects.get(member=self.buyer, month='2026-10')
        self.assertEqual(next_row.carry_forward, Decimal('0.00'))
        self.assertEqual(next_row.payable_amount, Decimal('1000.00'))

    def test_leftover_follows_the_pool_not_the_previous_buyer(self):
        """The next buyer spends contributions plus the balance left behind."""
        self._contribute('2026-09')
        self._buy(date(2026, 9, 15), '1500.00')
        PoolSettlementService.settle_month('2026-09', buying_member=self.buyer)

        self._contribute('2026-10')
        october = PoolSettlementService.get_month_status('2026-10')

        # 500 left over is spendable by whoever buys next, and no member is
        # asked for more than their plain share to get it back into the pot.
        self.assertEqual(october['opening_cash'], 500.0)
        self.assertEqual(october['available_cash'], 2500.0)
        self.assertEqual(october['total_expected'], 2000.0)

    def test_sale_after_the_purchase_cannot_fund_it(self):
        """
        Money that lands later did not exist when the order was placed.

        The buyer really was out of pocket, and the proceeds sit in the pot for
        the next purchase instead of retroactively covering the old one.
        """
        self._contribute('2026-08')
        held = self._buy(date(2026, 5, 27), '1000.00', quantity=2)
        self._buy(date(2026, 8, 12), '2500.00')          # 500 more than collected
        self._sell(held, date(2026, 8, 20), '1500.00')   # +3000, eight days later

        status = PoolSettlementService.get_month_status('2026-08')

        self.assertEqual(status['available_cash'], 2000.0)
        self.assertEqual(status['sale_proceeds'], 3000.0)
        self.assertEqual(status['late_sale_proceeds'], 3000.0)
        self.assertEqual(status['overspend'], 500.0)
        # The proceeds are still real money, waiting in the pool.
        self.assertEqual(status['closing_cash'], 3000.0)

    def test_late_proceeds_are_spendable_the_following_month(self):
        """What arrived too late for one purchase funds the next one."""
        self._contribute('2026-08')
        held = self._buy(date(2026, 5, 27), '1000.00', quantity=2)
        self._buy(date(2026, 8, 12), '2500.00')
        self._sell(held, date(2026, 8, 20), '1500.00')
        self._contribute('2026-09')

        september = PoolSettlementService.get_month_status('2026-09')

        self.assertEqual(september['opening_cash'], 3000.0)
        self.assertEqual(september['available_cash'], 5000.0)

    def test_reported_scenario_august_then_september(self):
        """
        The reported case, end to end, with the real dates and figures.

        August: 10,085.93 collected, 10,721.90 bought on the 12th, so the buyer
        covered 635.97 from their pocket. The 3,928.20 sale landed on the 20th -
        too late for that order - so it stayed in the pool.

        September: the buyer's installment drops by the 635.97 they are owed,
        which is why only 10,364.03 comes in. On top of the 3,928.20 already in
        the pot that makes 14,292.23. Buying 13,266.40 leaves 1,025.83 in the
        pool, with nobody out of pocket and nobody billed.
        """
        self._contribute('2026-08', amounts=('5042.96', '5042.97'))
        held = self._buy(date(2026, 5, 27), '150.00', quantity=12)
        self._buy(date(2026, 8, 12), '10721.90')
        self._sell(held, date(2026, 8, 20), '327.35')     # 12 x 327.35 = 3928.20

        august = PoolSettlementService.settle_month('2026-08', buying_member=self.buyer)

        self.assertEqual(august['available_cash'], 10085.93)
        self.assertEqual(august['late_sale_proceeds'], 3928.20)
        self.assertEqual(august['overspend'], 635.97)
        self.assertEqual(august['closing_cash'], 3928.20)

        # Settling August wrote the buyer's September row with their refund.
        buyer_september = Contribution.objects.get(member=self.buyer, month='2026-09')
        self.assertEqual(buyer_september.advance_credit, Decimal('635.97'))
        self.assertEqual(buyer_september.amount, Decimal('364.03'))
        buyer_september.status = 'paid'
        buyer_september.save()

        # Everyone else's September share, as one row for brevity.
        Contribution.objects.create(
            member=self.other, month='2026-09',
            amount=Decimal('10000.00'), base_amount=Decimal('10000.00'),
            status='paid',
        )
        self._buy(date(2026, 9, 20), '13266.40')

        september = PoolSettlementService.settle_month('2026-09', buying_member=self.other)

        self.assertEqual(september['opening_cash'], 3928.20)
        self.assertEqual(september['base_collected'], 10364.03)
        self.assertEqual(september['available_cash'], 14292.23)
        self.assertEqual(september['overspend'], 0.0)
        self.assertEqual(september['pool_cash_carried'], 1025.83)

        # September's buyer paid nothing extra and owes nothing extra.
        september_buyer = Contribution.objects.get(member=self.other, month='2026-09')
        self.assertEqual(september_buyer.buyer_topup, Decimal('0.00'))
        self.assertEqual(september_buyer.carry_forward, Decimal('0.00'))

        # And the 1,025.83 is still there for October's purchase.
        self.assertEqual(
            PoolSettlementService.get_month_status('2026-10')['opening_cash'], 1025.83
        )

    def test_settling_twice_gives_the_same_answer(self):
        """Re-settling must not double-count the top-up it already recorded."""
        self._contribute('2026-09')
        sold = self._buy(date(2026, 8, 10), '500.00', quantity=2)
        self._sell(sold, date(2026, 9, 1), '600.00')
        self._buy(date(2026, 9, 15), '3500.00')

        first = PoolSettlementService.settle_month('2026-09', buying_member=self.buyer)
        second = PoolSettlementService.settle_month('2026-09', buying_member=self.buyer)

        self.assertEqual(first['overspend'], second['overspend'])
        self.assertEqual(second['overspend'], 300.0)

    def test_partial_sale_proceeds_count_for_the_quantity_sold(self):
        """A partial sale splits into its own row; only that row's cash counts."""
        self._contribute('2026-09')
        holding = self._buy(date(2026, 8, 10), '500.00', quantity=10)
        holding.quantity = 6
        holding.save()
        sold_part = Stock.objects.create(
            symbol='TCS.NS', name='TCS', quantity=4,
            buy_price=Decimal('500.00'), brokerage=Decimal('0.00'),
            buy_date=date(2026, 8, 10), buyer=self.buyer,
            is_sold=True, sell_price=Decimal('700.00'), sell_date=date(2026, 9, 2),
        )

        status = PoolSettlementService.get_month_status('2026-09')

        self.assertEqual(sold_part.quantity, 4)
        self.assertEqual(status['sale_proceeds'], 2800.0)


class CashCustodyTests(TestCase):
    """
    The pool has no account, so its cash always sits in a member's hands.

    Proceeds land in the demat the shares were sold from, leftovers stay with
    whoever bought, and each month the holders send what they have to the next
    buyer along with their own contribution.
    """

    def setUp(self):
        self.seller = Member.objects.create_user(
            phone='9000000101', name='Seller', password='x'
        )
        self.first_buyer = Member.objects.create_user(
            phone='9000000102', name='First Buyer', password='x'
        )
        self.next_buyer = Member.objects.create_user(
            phone='9000000103', name='Next Buyer', password='x'
        )
        self.members = (self.seller, self.first_buyer, self.next_buyer)

    def _contribute(self, month, amount='1000.00', status='paid'):
        for member in self.members:
            Contribution.objects.get_or_create(
                member=member,
                month=month,
                defaults={
                    'amount': Decimal(amount),
                    'base_amount': Decimal(amount),
                    'status': status,
                },
            )

    def _buy(self, buyer, day, price, quantity=1):
        return Stock.objects.create(
            symbol='TCS.NS', name='TCS', quantity=quantity,
            buy_price=Decimal(price), brokerage=Decimal('0.00'),
            buy_date=day, buyer=buyer,
        )

    def _sell(self, stock, day, price):
        stock.is_sold = True
        stock.sell_price = Decimal(price)
        stock.sell_date = day
        stock.save()
        return stock

    def _sent(self, plan, name):
        for row in plan['transfers']:
            if row['member_name'] == name:
                return row
        return None

    def test_seller_hands_proceeds_over_with_their_contribution(self):
        """The reported flow: sale money travels with the monthly payment."""
        held = self._buy(self.seller, date(2026, 5, 27), '1500.00', quantity=2)
        self._contribute('2026-08')
        self._buy(self.first_buyer, date(2026, 8, 12), '3000.00')
        self._sell(held, date(2026, 8, 20), '1964.10')  # +3928.20, after the buy
        self._contribute('2026-09')

        plan = PoolSettlementService.handover_plan('2026-09')

        seller = self._sent(plan, 'Seller')
        self.assertEqual(seller['holding'], 3928.20)
        self.assertEqual(seller['contribution'], 1000.0)
        self.assertEqual(seller['total'], 4928.20)
        self.assertEqual(plan['pool_cash_in_hands'], 3928.20)

    def test_leftover_moves_to_the_following_buyer(self):
        """The cycle repeats: this month's change is next month's handover."""
        self._contribute('2026-08')
        self._buy(self.first_buyer, date(2026, 8, 12), '2500.00')  # 500 change
        self._contribute('2026-09')
        MonthlyPool.objects.update_or_create(
            month='2026-09', defaults={'buying_member': self.next_buyer}
        )

        plan = PoolSettlementService.handover_plan('2026-09')

        first = self._sent(plan, 'First Buyer')
        self.assertEqual(first['holding'], 500.0)
        self.assertEqual(first['total'], 1500.0)
        self.assertEqual(plan['buying_member_name'], 'Next Buyer')
        self.assertEqual(plan['buyer_keeps']['member_name'], 'Next Buyer')

    def test_a_buyer_who_came_up_short_holds_nothing(self):
        """They paid out of pocket, so there is no pool cash left with them."""
        self._contribute('2026-08')
        self._buy(self.first_buyer, date(2026, 8, 12), '4000.00')  # 1000 short
        self._contribute('2026-09')

        plan = PoolSettlementService.handover_plan('2026-09')

        first = self._sent(plan, 'First Buyer')
        self.assertEqual(first['holding'], 0.0)
        self.assertEqual(plan['pool_cash_in_hands'], 0.0)

    def test_handover_total_matches_the_pool_ledger(self):
        """
        The two views must never disagree.

        The custody list is only a breakdown of the same pot the settlement
        maths uses, so what reaches the buyer has to equal what the pool says
        is available.
        """
        held = self._buy(self.seller, date(2026, 5, 27), '1500.00', quantity=2)
        self._contribute('2026-08')
        self._buy(self.first_buyer, date(2026, 8, 12), '2500.00')
        self._sell(held, date(2026, 8, 20), '1964.10')
        self._contribute('2026-09')
        self._buy(self.next_buyer, date(2026, 9, 20), '5000.00')

        plan = PoolSettlementService.handover_plan('2026-09')
        status = PoolSettlementService.get_month_status('2026-09')

        self.assertEqual(plan['available_cash'], status['available_cash'])

    def test_unpaid_contributions_are_flagged_but_not_counted(self):
        """A member who has not paid still owes the handover, visibly."""
        self._contribute('2026-08')
        self._buy(self.first_buyer, date(2026, 8, 12), '2500.00')
        self._contribute('2026-09', status='unpaid')

        plan = PoolSettlementService.handover_plan('2026-09')
        status = PoolSettlementService.get_month_status('2026-09')

        pending = [row for row in plan['transfers'] if row['status'] != 'paid']
        self.assertTrue(pending)
        # Expected includes what is still owed; available counts only real cash.
        self.assertGreater(plan['expected_to_buyer'], plan['available_cash'])
        self.assertEqual(plan['available_cash'], status['available_cash'])
