from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from contributions.models import Contribution
from dividends.models import Dividend
from .models import Stock
from .serializers import StockCreateSerializer, StockSellSerializer


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
        self.assertEqual(sold_stock.sell_price, Decimal('130.00'))
        self.assertEqual(sold_stock.sell_date, date(2026, 2, 1))
        self.assertEqual(Stock.objects.count(), 2)
        self.assertEqual(
            sum(stock.total_invested for stock in Stock.objects.all()),
            Decimal('550.00'),
        )

    def test_full_sale_marks_original_purchase_sold(self):
        serializer = StockSellSerializer(
            self.stock,
            data={
                'quantity': 5,
                'sell_price': '130.00',
                'sell_date': '2026-02-01',
                'notes': '',
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        sold_stock = serializer.save()

        self.assertEqual(sold_stock.pk, self.stock.pk)
        self.assertTrue(sold_stock.is_sold)
        self.assertEqual(sold_stock.quantity, 5)
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

    def test_purchase_cannot_exceed_available_pool_cash(self):
        serializer = StockCreateSerializer(data={
            'symbol': 'INFY',
            'name': 'Infosys',
            'quantity': 12,
            'buy_price': '100.00',
            'brokerage': '0.01',
            'buy_date': '2026-03-01',
            'buyer': self.admin.id,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)

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
            'buyer': self.admin.id,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
