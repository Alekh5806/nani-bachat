from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from contributions.models import Contribution
from dividends.models import Dividend
from investments.models import Stock
from portfolio.services import PortfolioService


class PortfolioAccountingTests(TestCase):
    def setUp(self):
        member_model = get_user_model()
        self.member = member_model.objects.create_user(
            phone='9999999999',
            name='Admin',
            password='admin123',
            role='admin',
        )
        Contribution.objects.create(
            member=self.member,
            month='2026-01',
            amount=Decimal('1000.00'),
            status='paid',
            paid_date=date(2026, 1, 5),
        )

    def test_sold_stock_proceeds_remain_in_pool_cash(self):
        Stock.objects.create(
            symbol='TCS.NS',
            name='TCS',
            quantity=5,
            buy_price=Decimal('100.00'),
            brokerage=Decimal('50.00'),
            buy_date=date(2026, 1, 10),
            buyer=self.member,
            current_price=Decimal('120.00'),
        )
        Stock.objects.create(
            symbol='INFY.NS',
            name='Infosys',
            quantity=2,
            buy_price=Decimal('100.00'),
            brokerage=Decimal('20.00'),
            buy_date=date(2026, 1, 10),
            buyer=self.member,
            current_price=Decimal('120.00'),
            is_sold=True,
            sell_price=Decimal('130.00'),
            sell_date=date(2026, 2, 1),
        )

        with patch('portfolio.services.StockPriceService.get_stock_price', return_value=None):
            summary = PortfolioService.get_portfolio_summary()

        self.assertEqual(summary['total_invested'], 1000.00)
        self.assertEqual(summary['active_stock_value'], 600.00)
        self.assertEqual(summary['realized_sale_value'], 260.00)
        self.assertEqual(summary['cash_balance'], 490.00)
        self.assertEqual(summary['current_value'], 1090.00)
        self.assertEqual(summary['profit_loss'], 90.00)
        self.assertEqual(summary['realized_profit_loss'], 40.00)
        self.assertEqual(summary['unrealized_profit_loss'], 50.00)

    def test_dividends_are_kept_separate_from_pool_cash(self):
        stock = Stock.objects.create(
            symbol='TCS.NS',
            name='TCS',
            quantity=5,
            buy_price=Decimal('100.00'),
            brokerage=Decimal('0.00'),
            buy_date=date(2026, 1, 10),
            buyer=self.member,
            current_price=Decimal('100.00'),
        )
        Dividend.objects.create(
            stock=stock,
            dividend_per_share=Decimal('2.00'),
            ex_date=date(2026, 2, 1),
        )

        with patch('portfolio.services.StockPriceService.get_stock_price', return_value=None):
            summary = PortfolioService.get_portfolio_summary()

        self.assertEqual(summary['cash_balance'], 500.00)
        self.assertEqual(summary['current_value'], 1010.00)
        self.assertEqual(summary['profit_loss'], 10.00)
        self.assertEqual(summary['total_dividends'], 10.00)


class CompanyLogoTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def test_first_source_with_a_logo_wins_and_is_cached(self):
        from portfolio import logos
        with patch.object(logos, 'PROVIDERS', (lambda s: None, lambda s: 'http://b/' + s, lambda s: 'http://c/' + s)):
            first = logos.get_logo_urls(['TCS.NS'])
        self.assertEqual(first['TCS.NS'], 'http://b/TCS.NS')
        calls = []
        with patch.object(logos, 'PROVIDERS', (lambda s: calls.append(s),)):
            self.assertEqual(logos.get_logo_urls(['TCS.NS'])['TCS.NS'], 'http://b/TCS.NS')
        self.assertEqual(calls, [])

    def test_failing_source_falls_through_to_next(self):
        from portfolio import logos

        def boom(symbol):
            raise RuntimeError('down')

        with patch.object(logos, 'PROVIDERS', (boom, lambda s: 'http://c/' + s)):
            self.assertEqual(logos.get_logo_urls(['BEL.NS'])['BEL.NS'], 'http://c/BEL.NS')

    def test_no_source_has_logo_gives_none_and_is_cached(self):
        from portfolio import logos
        calls = []
        with patch.object(logos, 'PROVIDERS', (lambda s: calls.append(s),)):
            self.assertIsNone(logos.get_logo_urls(['NOPE.NS'])['NOPE.NS'])
            logos.get_logo_urls(['NOPE.NS'])
        self.assertEqual(len(calls), 1)

    def test_all_sources_down_is_not_cached(self):
        from portfolio import logos

        def boom(symbol):
            raise RuntimeError('down')

        calls = []

        def counting(symbol):
            calls.append(symbol)
            raise RuntimeError('down')

        with patch.object(logos, 'PROVIDERS', (boom, counting)):
            logos.get_logo_urls(['TCS.NS'])
            logos.get_logo_urls(['TCS.NS'])
        self.assertEqual(len(calls), 2)

    def test_manual_logo_is_used_for_both_exchanges(self):
        from portfolio import logos
        with patch.object(logos, 'PROVIDERS', (logos._manual, lambda s: 'http://next/' + s)):
            result = logos.get_logo_urls(['NSDL.BO', 'NSDL.NS', 'TCS.NS'])
        self.assertIn('INE301O01023', result['NSDL.BO'])
        self.assertEqual(result['NSDL.BO'], result['NSDL.NS'])
        self.assertEqual(result['TCS.NS'], 'http://next/TCS.NS')
