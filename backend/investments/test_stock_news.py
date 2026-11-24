from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from bs4 import BeautifulSoup
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from dividends.models import Dividend
from .models import Stock
from .news_sources import SourceError, company_filings, dividend_dates, nse_dividend_rate
from .serializers import StockSellSerializer

EX = date(2025, 10, 14)
TODAY = EX + timedelta(days=7)
EVENT = {'kind': 'Dividend', 'title': 'Final Dividend - Rs 5 Per Share',
         'rate': Decimal('5'), 'date': EX, 'url': 'https://www.nseindia.com/'}


class NewsSourceTests(SimpleTestCase):
    def test_only_unambiguous_rupee_rates(self):
        self.assertEqual(nse_dividend_rate('Interim Dividend Rs 11 Per Share/ Special Dividend Rs 46 Per Share'), 57)
        self.assertEqual(nse_dividend_rate('Interim Dividend - Re 0.025 Per Share'), Decimal('.025'))
        for purpose in ('Dividend: 50% of face value Rs 10', 'Dividend Rs 5 Per Share (subject to approval)',
                        'Dividend Rs 5 Per Share and an additional special dividend', 'Buy Back'):
            self.assertIsNone(nse_dividend_rate(purpose))

    @patch('investments.news_sources.get_page')
    def test_calendar_matches_displayed_exchange_and_handles_optional_dates(self, page):
        page.return_value = BeautifulSoup("""
            <title>Sample (BOM:123456) Dividend History</title>
            <link rel="canonical" href="https://stockanalysis.com/quote/nse/SAMPLE/dividend/">
            <table><thead><tr><th>Ex-Div<span>idend</span> Date</th><th>Cash Amount</th>
            <th>Record Date</th><th>Pay Date</th></tr></thead>
            <tbody><tr><td>Oct 14, 2025</td><td>5.000 INR</td><td>Oct 15, 2025</td><td>n/a</td></tr></tbody></table>
        """, 'html.parser')
        details = dividend_dates('bom', '123456')[EX]
        self.assertEqual(details['record'], EX + timedelta(days=1))
        self.assertIsNone(details['pay'])
        self.assertEqual(details['rate'], 5)
        with self.assertRaises(SourceError):
            dividend_dates('nse', 'SAMPLE')

    @patch('investments.news_sources.get_page')
    def test_filing_requires_exact_listing_and_exchange_link(self, page):
        page.return_value = BeautifulSoup("""
            <a href="https://www.nseindia.com/get-quotes/equity?symbol=ABC"></a>
            <div id="company-announcements-tab"><ul>
            <li><a href="https://www.bseindia.com/sample.pdf">Quarterly results
            <time datetime="2025-10-14T17:00:00+05:30">14 Oct</time></a></li>
            <li><a href="https://example.org/">Market news</a></li></ul></div>
        """, 'html.parser')
        filings, _ = company_filings('ABC.NS')
        self.assertEqual([f['title'] for f in filings], ['Quarterly results'])
        for symbol in ['AB.NS', 'ABC.BO']:
            with self.assertRaises(SourceError):
                company_filings(symbol)


class GroupStockNewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.member = get_user_model().objects.create_user(phone='9900112233', name='Buyer')
        self.admin = get_user_model().objects.create_user(phone='9900112244', name='Admin', role='admin')
        self.client.force_authenticate(self.member)
        self.url = reverse('investments:stock-news')
        cache.clear()
        self.addCleanup(cache.clear)
        self.start_patch('django.utils.timezone.localdate', return_value=TODAY)
        self.actions = self.start_patch('investments.stock_news.nse_actions', return_value=[EVENT])
        self.filings = self.start_patch('investments.stock_news.company_filings', return_value=([], None))
        self.dates = self.start_patch('investments.stock_news.dividend_dates', return_value={})

    def start_patch(self, *args, **kwargs):
        patcher = patch(*args, **kwargs)
        self.addCleanup(patcher.stop)
        return patcher.start()

    def lot(self, qty, buy=EX - timedelta(days=10), sell=None, symbol='ABC.NS', buyer=None):
        return Stock.objects.create(symbol=symbol, name='Example', quantity=qty, buy_date=buy,
                                    buy_price=100, is_sold=sell is not None, sell_date=sell,
                                    buyer=buyer or self.member)

    def news(self):
        response = self.client.get(self.url, {'symbol': 'ABC.NS'})
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_auth_group_scope_and_exchange_identity(self):
        self.lot(1, symbol=' abc ')
        self.lot(2)
        self.lot(1, symbol='ABC.BO')
        self.lot(1, symbol='FUTURE.NS', buy=TODAY + timedelta(days=1))
        stocks = self.client.get(self.url).json()['stocks']
        self.assertEqual([s['symbol'] for s in stocks], ['ABC.BO', 'ABC.NS'])
        self.assertEqual(self.client.get(self.url, {'symbol': 'AB.NS'}).status_code, 404)
        self.assertEqual(self.client.get(self.url, {'symbol': 'FUTURE.NS'}).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.actions.assert_not_called()
        self.filings.assert_not_called()

    def test_partial_sale_boundary_lots_repeated_events_and_edit(self):
        lot = self.lot(10)
        sale = StockSellSerializer(lot, data={'quantity': 4, 'sell_price': '105', 'sell_date': EX}, partial=True)
        self.assertTrue(sale.is_valid(), sale.errors)
        sold = sale.save()
        self.lot(3, buy=EX)
        self.lot(2, sell=EX - timedelta(days=1))
        self.lot(5, buyer=self.admin)
        self.actions.return_value = [EVENT, EVENT]
        self.assertEqual(self.news()['items'][0]['shares'], 15)
        self.assertEqual(len(self.news()['items']), 1)
        Stock.objects.filter(pk=sold.pk).update(sell_date=EX - timedelta(days=1))
        self.assertEqual(self.news()['items'][0]['expected'], '55.00')
        self.actions.assert_called_once()
        self.assertFalse(Dividend.objects.exists())

    def test_fully_sold_pending_until_each_buyers_receipt_is_dated(self):
        one = self.lot(3, sell=EX)
        two = self.lot(3, sell=TODAY, buyer=self.admin)
        self.actions.return_value = [EVENT, {**EVENT, 'date': TODAY + timedelta(days=1)}]
        self.assertEqual(len(self.news()['items']), 1)
        self.filings.assert_not_called()
        receipt = dict(dividend_per_share=Decimal(5), ex_date=EX, payment_date=TODAY)
        Dividend.objects.create(stock=one, **receipt)
        other = Dividend.objects.create(stock=one, **receipt)
        self.assertEqual(self.news()['items'][0]['received'], '30.00')
        other.stock = two
        other.payment_date = None
        other.save()
        self.assertEqual(self.news()['items'][0]['undated'], '15.00')
        other.payment_date = TODAY
        other.save()
        self.assertEqual(self.news()['items'], [])

    def test_future_dividend_and_ambiguous_rate_or_share_count(self):
        self.lot(2)
        self.actions.return_value = [{**EVENT, 'date': TODAY + timedelta(days=2)}]
        future = self.news()['items'][0]
        self.assertTrue(future['projected'])
        self.assertEqual(future['expected'], '10.00')
        self.actions.return_value += [{**EVENT, 'kind': 'Bonus', 'date': EX, 'title': 'Bonus 1:1'}]
        cache.clear()
        self.assertIsNone(self.news()['items'][0]['expected'])
        self.actions.return_value = [EVENT]
        self.dates.return_value = {EX: {'rate': Decimal(7), 'record': EX, 'pay': None, 'url': 'https://example.org'}}
        cache.clear()
        self.assertIsNone(self.news()['items'][0]['expected'])

    def test_failed_source_keeps_filing_and_does_not_guess_amount(self):
        self.lot(1)
        self.filings.return_value = ([{'kind': 'Filing', 'title': 'Quarterly results', 'date': EX,
                                       'url': 'https://www.bseindia.com/sample.pdf'}], None)
        self.actions.side_effect = SourceError('Upstream error')
        self.dates.return_value = {EX: {'rate': Decimal(5), 'record': EX, 'pay': None, 'url': 'https://example.org'}}
        data = self.news()
        self.assertTrue(data['issues'])
        self.assertEqual([item['kind'] for item in data['items']], ['Dividend', 'Filing'])
        self.assertIsNone(data['items'][0]['expected'])

    def test_receipt_workflow_handles_sold_lots_subpaise_rates_and_stale_quantity(self):
        lot = self.lot(3, sell=EX)
        ineligible = self.lot(2, buy=EX)
        stock_list = self.client.get(reverse('investments:stock-list'), {'dividend_ex_date': EX})
        self.assertEqual([s['id'] for s in stock_list.json()['results']], [lot.pk])
        url = reverse('dividends:dividend-create')
        form = dict(stock=lot.pk, expected_quantity=3, submission_key='form-123',
                    dividend_per_share='0.025', ex_date=EX, payment_date=TODAY)
        self.assertEqual(self.client.post(url, form).status_code, 403)
        self.client.force_authenticate(self.admin)
        for change in [{'stock': ineligible.pk}, {'expected_quantity': 4}, {'dividend_per_share': 0},
                       {'payment_date': EX - timedelta(days=1)}, {'payment_date': TODAY + timedelta(days=1)}]:
            self.assertEqual(self.client.post(url, {**form, **change}).status_code, 400)
        with patch('accounts.notifications.notify_dividend_recorded') as notify:
            self.assertEqual(self.client.post(url, form).status_code, 201)
            self.assertEqual(self.client.post(url, form).status_code, 201)
            notify.assert_called_once()
            self.assertEqual(self.client.post(url, {**form, 'dividend_per_share': '0.05'}).status_code, 400)
        receipt = Dividend.objects.get()
        self.assertEqual(receipt.total_dividend, Decimal('.08'))
        Stock.objects.filter(pk=lot.pk).update(quantity=1)
        self.client.patch(reverse('dividends:dividend-update', args=[receipt.pk]), {'notes': 'Bank credit'})
        receipt.refresh_from_db()
        self.assertEqual(receipt.total_dividend, Decimal('.08'))
