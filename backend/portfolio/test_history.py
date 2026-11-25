from datetime import date, datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from contributions.models import Contribution
from dividends.models import Dividend
from investments.models import Stock
from portfolio.models import PortfolioSnapshot
from portfolio.services import PortfolioService
from portfolio.tasks import save_daily_snapshot


class PortfolioHistoryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.today = date(2026, 11, 25)
        # In UTC it is still the previous day.
        clock = patch('django.utils.timezone.now', return_value=datetime(2026, 11, 24, 20, tzinfo=dt_timezone.utc))
        clock.start()
        self.addCleanup(clock.stop)
        refresh = patch('portfolio.services.StockPriceService.refresh_in_background')
        refresh.start()
        self.addCleanup(refresh.stop)
        self.member = get_user_model().objects.create_user(phone='9000000001', name='History test')
        self.client = APIClient()
        self.client.force_authenticate(self.member)
        Contribution.objects.create(member=self.member, month='2026-11', status='paid', amount=1000)
        self.stock = Stock.objects.create(
            symbol='TEST.NS', name='Test stock', quantity=5, buy_price=100,
            brokerage=20, current_price=120, buy_date=self.today - timedelta(days=10),
        )
        Dividend.objects.create(stock=self.stock, dividend_per_share=Decimal('2'), ex_date=self.today)

    def snapshot(self, days_ago, value=900):
        return PortfolioSnapshot.objects.create(date=self.today - timedelta(days=days_ago), total_current_value=value)

    def test_dashboard_creates_today_without_scheduler_and_matches_balance(self):
        self.snapshot(-1, 999999)  # Ignore incorrectly dated future records.
        response = self.client.get('/api/portfolio/dashboard/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        current = data['growth_data'][0]
        self.assertEqual(current['date'], '2026-11-25')
        self.assertEqual(Decimal(current['total_current_value']), Decimal('1090'))
        self.assertEqual(float(current['total_current_value']), data['portfolio']['current_value'])
        self.assertEqual(float(current['total_profit_loss']), data['portfolio']['profit_loss'])
        self.assertEqual(current['total_dividends'], '10.00')
        self.assertTrue(data['growth_data_complete'])
        self.assertEqual(len(data['growth_data']), 1)
        self.assertFalse(PortfolioSnapshot.objects.filter(date=self.today - timedelta(days=1)).exists())

    def test_dashboard_and_task_update_same_day_without_rewriting_history(self):
        previous = self.snapshot(2, 700)
        self.client.get('/api/portfolio/dashboard/')
        self.stock.current_price = Decimal('130')
        self.stock.save()
        save_daily_snapshot()
        self.assertEqual(PortfolioSnapshot.objects.filter(date=self.today).count(), 1)
        self.assertEqual(PortfolioSnapshot.objects.get(date=self.today).total_current_value, Decimal('1140'))
        previous.refresh_from_db()
        self.assertEqual(previous.total_current_value, Decimal('700'))

    def test_range_includes_one_prior_record_and_never_fabricates_gaps(self):
        self.snapshot(30)
        self.snapshot(10, 950)
        self.snapshot(2, 1000)
        response = self.client.get('/api/portfolio/growth/', {'since': '2026-11-19', 'limit': 8})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['date'] for row in response.json()['results']], ['2026-11-25', '2026-11-23', '2026-11-15'])
        self.assertEqual(PortfolioSnapshot.objects.count(), 4)

    def test_long_history_paginates_and_reports_dashboard_truncation(self):
        for days in range(1, 46):
            self.snapshot(days)
        dashboard = self.client.get('/api/portfolio/dashboard/').json()
        self.assertFalse(dashboard['growth_data_complete'])
        self.assertEqual(len(dashboard['growth_data']), 30)
        first = self.client.get('/api/portfolio/growth/', {'limit': 'all'}).json()
        last = self.client.get('/api/portfolio/growth/', {'limit': 'all', 'page': 3}).json()
        self.assertEqual(first['count'], 46)
        self.assertEqual(len(first['results']), 20)
        self.assertEqual(len(last['results']), 6)
        self.assertIsNone(last['next'])

    def test_invalid_ranges_are_client_errors_without_writes(self):
        for params in [{'limit': value} for value in ('0', '-1', '1.5', 'bad')] + [
            {'since': '2026-02-30'}, {'since': '20261125'}, {'since': 'bad'},
        ]:
            with self.subTest(params=params):
                self.assertEqual(self.client.get('/api/portfolio/growth/', params).status_code, 400)
        self.assertEqual(PortfolioSnapshot.objects.count(), 0)

    def test_legacy_mobile_all_history_limit_remains_supported(self):
        self.snapshot(45)
        response = self.client.get('/api/portfolio/growth/', {'limit': '9007199254740991'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 2)

    def test_cached_quotes_and_different_lot_prices_reconcile_all_charts(self):
        Stock.objects.create(symbol='TEST.NS', name='Test stock', quantity=2, buy_price=100,
                             current_price=110, buy_date=self.today)
        for quote, expected in [(None, 820), ({'current_price': 125}, 875)]:
            with self.subTest(quote=quote):
                if quote:
                    cache.set('stock_price_TEST.NS', quote)
                summary = PortfolioService.get_portfolio_summary()
                allocation = PortfolioService.get_allocation_data()
                holdings = self.client.get('/api/investments/stocks/summary/').json()
                self.assertEqual(summary['active_stock_value'], expected)
                self.assertEqual(next(row['value'] for row in allocation if row['symbol'] == 'TEST.NS'), expected)
                self.assertEqual(holdings['total_current_value'], expected)

    def test_empty_portfolio_records_zero_instead_of_disappearing(self):
        Dividend.objects.all().delete()
        Stock.objects.all().delete()
        Contribution.objects.all().delete()
        data = self.client.get('/api/portfolio/dashboard/').json()
        self.assertEqual(data['growth_data'][0]['total_current_value'], '0.00')

    def test_growth_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/portfolio/growth/').status_code, 401)
        self.assertEqual(PortfolioSnapshot.objects.count(), 0)
