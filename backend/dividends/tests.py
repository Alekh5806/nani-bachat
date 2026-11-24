from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from investments.models import Stock
from .models import Dividend


class DividendSoftDeleteTests(TestCase):
    """Deleting a dividend hides it everywhere but keeps the row."""

    def setUp(self):
        self.admin = get_user_model().objects.create_user(phone='9000000021', name='Admin', role='admin')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        stock = Stock.objects.create(
            symbol='TCS.NS', name='TCS', quantity=10, buy_price=Decimal('100.00'),
            buyer=self.admin, buy_date=date(2026, 1, 1),
        )
        self.keep = Dividend.objects.create(stock=stock, dividend_per_share=Decimal('1.00'), ex_date=date(2026, 2, 1))
        self.gone = Dividend.objects.create(stock=stock, dividend_per_share=Decimal('3.00'), ex_date=date(2026, 3, 1))

    def delete_gone(self):
        return self.client.delete(reverse('dividends:dividend-delete', args=[self.gone.pk]))

    def test_delete_keeps_the_row_and_marks_it_deleted(self):
        self.assertEqual(self.delete_gone().status_code, 204)
        self.assertIsNotNone(Dividend.all_objects.get(pk=self.gone.pk).deleted_at)
        self.assertFalse(Dividend.objects.filter(pk=self.gone.pk).exists())

    def test_deleted_dividend_is_hidden_from_list_and_totals(self):
        self.delete_gone()
        listed = self.client.get(reverse('dividends:dividend-list')).data
        rows = listed['results'] if isinstance(listed, dict) and 'results' in listed else listed
        self.assertEqual([r['id'] for r in rows], [self.keep.pk])
        summary = self.client.get(reverse('dividends:dividend-summary')).data
        self.assertEqual(Decimal(str(summary['total_dividends'])), Decimal('10.00'))
        self.assertEqual(summary['total_entries'], 1)

    def test_deleting_twice_returns_404(self):
        self.delete_gone()
        self.assertEqual(self.delete_gone().status_code, 404)

    def test_only_admin_can_delete(self):
        member = get_user_model().objects.create_user(phone='9000000022', name='Member')
        self.client.force_authenticate(member)
        self.assertEqual(self.delete_gone().status_code, 403)
        self.assertTrue(Dividend.objects.filter(pk=self.gone.pk).exists())
