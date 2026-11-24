from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from contributions.models import Contribution, MonthlyPool
from contributions.services import PoolSettlementService
from portfolio.services import PortfolioService
from dividends.models import Dividend
from .models import Stock
from .serializers import StockCreateSerializer, StockSellSerializer


class StockSummaryTests(TestCase):
    def test_multiple_purchase_dates_are_one_holding_when_quote_is_unavailable(self):
        member = get_user_model().objects.create_user(phone='9000000001', name='Member')
        for day in (1, 2):
            Stock.objects.create(symbol='POOL.NS', name='Pool', buy_date=date(2026, 1, day),
                                 quantity=2, buy_price=100, current_price=120)
        cache.delete('stock_price_POOL.NS')
        client = APIClient()
        client.force_authenticate(member)
        with patch('investments.views.StockPriceService.refresh_in_background') as refresh, \
                patch('investments.views.StockPriceService.get_stock_price') as fetch:
            summary = client.get(reverse('investments:stock-summary')).json()
        refresh.assert_called_once_with(['POOL.NS'])
        fetch.assert_not_called()
        self.assertEqual(summary['total_stocks'], 1)
        self.assertEqual(summary['total_current_value'], 480)
        allocation = PortfolioService.get_allocation_data()
        self.assertEqual([row['quantity'] for row in allocation if row['symbol'] == 'POOL.NS'], [4])


class StockSellSerializerTests(TestCase):
    def setUp(self):
        member_model = get_user_model()
        self.admin = member_model.objects.create_user(
            phone='9999999999',
            name='Admin',
            password='admin123',
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        self.stock = Stock.objects.create(
            symbol='TCS.NS',
            name='TCS',
            quantity=5,
            buy_price=Decimal('100.00'),
            brokerage=Decimal('50.00'),
            buy_date=date(2026, 1, 10),
            buyer=self.admin,
            current_price=Decimal('120.00'),
        )

    def test_partial_sale_splits_purchase_and_preserves_cost_basis(self):
        serializer = StockSellSerializer(
            self.stock,
            data={
                'quantity': 2,
                'sell_price': '130.00',
                'sell_date': '2026-02-01',
                'sell_brokerage': '8.75',
                'notes': 'Partial exit',
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        sold_stock = serializer.save()
        self.stock.refresh_from_db()

        self.assertFalse(self.stock.is_sold)
        self.assertEqual(self.stock.quantity, 3)
        self.assertEqual(self.stock.brokerage, Decimal('30.00'))
        self.assertTrue(sold_stock.is_sold)
        self.assertEqual(sold_stock.quantity, 2)
        self.assertEqual(sold_stock.brokerage, Decimal('20.00'))
        self.assertEqual(sold_stock.net_sale_proceeds, Decimal('251.25'))
        self.assertEqual(self.stock.sell_brokerage, 0)
        self.assertEqual(sold_stock.sell_price, Decimal('130.00'))
        self.assertEqual(sold_stock.sell_date, date(2026, 2, 1))
        self.assertEqual(Stock.objects.count(), 2)
        self.assertEqual(
            sum(stock.total_invested for stock in Stock.objects.all()),
            Decimal('550.00'),
        )

    def test_reported_purchase_amount_survives_partial_sale_and_settlement_replay(self):
        self.stock.buy_price = Decimal('230.77')
        self.stock.quantity = 62
        self.stock.reported_share_amount = Decimal('14307.80')
        self.stock.brokerage = Decimal('43.40')
        self.stock.save()
        Contribution.objects.create(member=self.admin, month='2026-01', status='paid',
                                    amount=Decimal('14280.20'), base_amount=Decimal('14280.20'))
        sale = StockSellSerializer(self.stock, data={
            'quantity': 7, 'sell_price': '240.00', 'sell_date': '2026-02-01',
        }, partial=True)
        self.assertTrue(sale.is_valid(), sale.errors)
        sale.save()
        result = PoolSettlementService.settle_month('2026-01')
        self.assertEqual(result['total_invested'], 14351.20)
        self.assertEqual(result['overspend'], 71)
        self.assertEqual(result['buyer_next_installment'], 929)

    def test_full_sale_marks_original_purchase_sold(self):
        serializer = StockSellSerializer(
            self.stock,
            data={
                'quantity': 5,
                'sell_price': '130.00',
                'sell_date': '2026-02-01',
                'sell_brokerage': '9.50',
                'notes': '',
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        sold_stock = serializer.save()

        self.assertEqual(sold_stock.pk, self.stock.pk)
        self.assertTrue(sold_stock.is_sold)
        self.assertEqual(sold_stock.quantity, 5)
        self.assertEqual(sold_stock.net_sale_proceeds, Decimal('640.50'))
        self.assertEqual(Stock.objects.count(), 1)

    def test_sale_quantity_cannot_exceed_available_quantity(self):
        serializer = StockSellSerializer(
            self.stock,
            data={
                'quantity': 6,
                'sell_price': '130.00',
                'sell_date': '2026-02-01',
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('quantity', serializer.errors)

    def test_sale_date_cannot_be_before_buy_date(self):
        serializer = StockSellSerializer(
            self.stock,
            data={
                'quantity': 1,
                'sell_price': '130.00',
                'sell_date': '2026-01-09',
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('sell_date', serializer.errors)

    def test_sale_price_must_be_positive(self):
        serializer = StockSellSerializer(
            self.stock,
            data={
                'quantity': 1,
                'sell_price': '0.00',
                'sell_date': '2026-02-01',
            },
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('sell_price', serializer.errors)

    @patch('accounts.notifications.notify_stock_sold')
    def test_sell_endpoint_sends_notification(self, notify_stock_sold):
        client = APIClient()
        client.force_authenticate(user=self.admin)
        url = reverse('investments:stock-sell', args=[self.stock.id])

        response = client.patch(
            url,
            {
                'quantity': 2,
                'sell_price': '130.00',
                'sell_date': '2026-02-01',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notify_stock_sold.assert_called_once()
        notified_stock = notify_stock_sold.call_args.args[0]
        self.assertTrue(notified_stock.is_sold)
        self.assertEqual(notified_stock.quantity, 2)
        self.assertEqual(notified_stock.sell_price, Decimal('130.00'))


class SaleEditTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(phone='9000000001', name='Buyer', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.sale = Stock.objects.create(
            symbol='TCS.NS', name='TCS', quantity=2, buy_price=Decimal('100.00'),
            brokerage=Decimal('1.75'), buyer=self.admin, buy_date=date(2026, 1, 1),
            is_sold=True, sell_date=date(2026, 2, 1), sell_price=Decimal('130.00'),
        )
        self.url = reverse('investments:sale-edit', args=[self.sale.pk])

    @patch('accounts.notifications.notify_stock_sold')
    def test_edit_and_retry_correct_the_existing_sale_and_cash(self, notify):
        Contribution.objects.create(member=self.admin, month='2026-01', amount=1000, status='paid')
        changes = {'sell_price': '128.10', 'sell_brokerage': '4.55', 'sell_date': '2026-03-01', 'notes': 'Contract note'}
        for _ in range(2):
            response = self.client.patch(self.url, changes, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        self.sale.refresh_from_db()
        self.assertEqual(Stock.objects.count(), 1)
        self.assertTrue(self.sale.is_sold)
        self.assertEqual(self.sale.quantity, 2)
        self.assertEqual(self.sale.total_invested, Decimal('201.75'))
        self.assertEqual(self.sale.net_sale_proceeds, Decimal('251.65'))
        self.assertEqual(self.sale.notes, 'Contract note')
        self.assertEqual(self.sale.sell_date, date(2026, 3, 1))
        summary = PortfolioService.get_portfolio_summary()
        self.assertEqual(summary['realized_profit_loss'], 49.90)
        self.assertEqual(summary['cash_balance'], 1049.90)
        self.assertEqual(PoolSettlementService.cash_position('2026-02')['sale_proceeds'], 0)
        self.assertEqual(PoolSettlementService.cash_position('2026-03')['sale_proceeds'], Decimal('251.65'))
        notify.assert_not_called()

    def test_edit_validates_amounts_dates_and_fixed_fields(self):
        for changes in [
            {'sell_brokerage': '-0.01'}, {'sell_brokerage': '260.01'},
            {'sell_price': '0'}, {'sell_price': '1.001'}, {'sell_price': None},
            {'sell_date': '2025-12-31'}, {'sell_date': str(timezone.localdate() + timedelta(days=1))},
            {'quantity': 1}, {'brokerage': '10.00'},
        ]:
            with self.subTest(changes=changes):
                self.assertEqual(self.client.patch(self.url, changes, format='json').status_code, 400)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.sell_brokerage, 0)
        self.assertEqual(self.sale.net_sale_proceeds, Decimal('260.00'))

    def test_member_cannot_edit_and_active_purchase_cannot_be_targeted(self):
        self.client.force_authenticate(get_user_model().objects.create_user(phone='9000000002', name='Member'))
        self.assertEqual(self.client.patch(self.url, {'notes': 'edit'}).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.sale.is_sold = False
        self.sale.save()
        self.assertEqual(self.client.patch(self.url, {'notes': 'edit'}).status_code, 404)

    def test_edit_revises_settled_advance_and_next_installment(self):
        Contribution.objects.create(member=self.admin, month='2026-02', status='paid')
        Stock.objects.create(symbol='TEST', name='Test', quantity=1, buy_price=1300,
                             buyer=self.admin, buy_date=date(2026, 2, 10))
        PoolSettlementService.settle_month('2026-02', buying_member=self.admin)
        feb = Contribution.objects.get(month='2026-02')
        self.assertEqual(feb.buyer_topup, 40)
        response = self.client.patch(self.url, {'sell_brokerage': '6.50'})
        self.assertEqual(response.status_code, 200, response.data)
        feb.refresh_from_db()
        self.assertEqual(feb.buyer_topup, Decimal('46.00'))
        self.assertEqual(Contribution.objects.get(month='2026-03').advance_credit, Decimal('46.00'))
        self.assertFalse(MonthlyPool.objects.filter(month='2026-03', is_settled=True).exists())

    def test_notes_skip_settlement_and_failed_settlement_rolls_back_sale(self):
        MonthlyPool.objects.create(month='2026-02', is_settled=True)  # Missing contributions
        self.assertEqual(self.client.patch(self.url, {'notes': 'Receipt checked'}).status_code, 200)
        self.assertEqual(self.client.patch(self.url, {'sell_price': '150.00'}).status_code, 400)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.notes, 'Receipt checked')
        self.assertEqual(self.sale.sell_price, Decimal('130.00'))


class StockCreateSerializerCashValidationTests(TestCase):
    def setUp(self):
        member_model = get_user_model()
        self.admin = member_model.objects.create_user(
            phone='8888888888',
            name='Admin',
            password='admin123',
            role='admin',
        )
        Contribution.objects.create(
            member=self.admin,
            month='2026-01',
            amount=Decimal('1000.00'),
            status='paid',
            paid_date=date(2026, 1, 5),
        )
        Stock.objects.create(
            symbol='TCS.NS',
            name='TCS',
            quantity=2,
            buy_price=Decimal('100.00'),
            brokerage=Decimal('0.00'),
            buy_date=date(2026, 1, 10),
            buyer=self.admin,
            current_price=Decimal('120.00'),
            is_sold=True,
            sell_price=Decimal('150.00'),
            sell_date=date(2026, 2, 1),
        )

    def test_purchase_can_use_contributions_plus_sale_cash(self):
        serializer = StockCreateSerializer(data={
            'symbol': 'INFY',
            'name': 'Infosys',
            'quantity': 11,
            'buy_price': '100.00',
            'brokerage': '0.00',
            'buy_date': '2026-03-01',
            'buyer': self.admin.id,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_purchase_above_pool_cash_requires_a_buyer(self):
        serializer = StockCreateSerializer(data={
            'symbol': 'INFY',
            'name': 'Infosys',
            'quantity': 12,
            'buy_price': '100.00',
            'brokerage': '0.01',
            'buy_date': '2026-03-01',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        funded = StockCreateSerializer(data={**serializer.initial_data, 'buyer': self.admin.id})
        self.assertTrue(funded.is_valid(), funded.errors)

    def test_purchase_cannot_use_dividend_cash(self):
        sold_stock = Stock.objects.get(symbol='TCS.NS')
        Dividend.objects.create(
            stock=sold_stock,
            dividend_per_share=Decimal('50.00'),
            ex_date=date(2026, 2, 15),
        )

        serializer = StockCreateSerializer(data={
            'symbol': 'INFY',
            'name': 'Infosys',
            'quantity': 12,
            'buy_price': '100.00',
            'brokerage': '0.00',
            'buy_date': '2026-03-01',
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


class StockSoftDeleteTests(TestCase):
    """Deleting a purchase hides it everywhere but keeps the row."""

    def setUp(self):
        # The summary view starts a background live-price refresh; keep it out of the tests.
        refresh = patch('portfolio.services.StockPriceService.refresh_in_background')
        refresh.start()
        self.addCleanup(refresh.stop)
        self.admin = get_user_model().objects.create_user(phone='9000000011', name='Admin', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.keep = Stock.objects.create(
            symbol='TCS.NS', name='TCS', quantity=2, buy_price=Decimal('100.00'),
            buyer=self.admin, buy_date=date(2026, 1, 1),
        )
        self.gone = Stock.objects.create(
            symbol='INFY.NS', name='Infosys', quantity=3, buy_price=Decimal('50.00'),
            buyer=self.admin, buy_date=date(2026, 1, 2),
        )
        self.dividend = Dividend.objects.create(
            stock=self.gone, dividend_per_share=Decimal('2.00'), ex_date=date(2026, 2, 1),
        )

    def delete_gone(self):
        return self.client.delete(reverse('investments:stock-delete', args=[self.gone.pk]))

    def test_delete_keeps_the_row_and_marks_it_deleted(self):
        self.assertEqual(self.delete_gone().status_code, 204)
        row = Stock.all_objects.get(pk=self.gone.pk)
        self.assertIsNotNone(row.deleted_at)
        self.assertFalse(Stock.objects.filter(pk=self.gone.pk).exists())

    def test_deleted_purchase_is_hidden_from_lists_and_summary(self):
        self.delete_gone()
        listed = self.client.get(reverse('investments:stock-list')).data
        rows = listed['results'] if isinstance(listed, dict) and 'results' in listed else listed
        self.assertEqual([r['symbol'] for r in rows], ['TCS.NS'])
        summary = self.client.get(reverse('investments:stock-summary')).data
        self.assertEqual([s['symbol'] for s in summary['stocks']], ['TCS.NS'])
        self.assertEqual(self.client.get(reverse('investments:stock-detail', args=[self.gone.pk])).status_code, 404)

    def test_dividends_of_a_deleted_purchase_are_hidden_too(self):
        self.assertEqual(Dividend.objects.count(), 1)
        self.delete_gone()
        self.assertEqual(Dividend.objects.count(), 0)
        self.assertEqual(Dividend.all_objects.count(), 1)

    def test_deleting_twice_returns_404(self):
        self.delete_gone()
        self.assertEqual(self.delete_gone().status_code, 404)

    def test_only_admin_can_delete(self):
        member = get_user_model().objects.create_user(phone='9000000012', name='Member')
        self.client.force_authenticate(member)
        self.assertEqual(self.delete_gone().status_code, 403)
        self.assertTrue(Stock.objects.filter(pk=self.gone.pk).exists())
