"""
Dividend models for PoolVest.
Tracks dividends received from stock holdings.
"""
from django.db import models
from investments.models import Stock
from decimal import Decimal


class Dividend(models.Model):
    """
    Dividend received from a stock holding.
    Total dividend = dividend_per_share × stock.quantity
    Per member share = total_dividend × member_ownership_percentage
    """
    stock = models.ForeignKey(
        Stock,
        on_delete=models.CASCADE,
        related_name='dividends'
    )
    dividend_per_share = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Dividend amount per share'
    )
    total_dividend = models.DecimalField(
        max_digits=12, decimal_places=2,
        editable=False,
        default=Decimal('0.00'),
        help_text='Auto-calculated: dividend_per_share × quantity'
    )
    ex_date = models.DateField(help_text='Ex-dividend date')
    payment_date = models.DateField(
        null=True, blank=True,
        help_text='Date dividend was paid'
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-ex_date']
        verbose_name = 'Dividend'
        verbose_name_plural = 'Dividends'

    def __str__(self):
        return f'{self.stock.symbol} - ₹{self.dividend_per_share}/share on {self.ex_date}'

    def save(self, *args, **kwargs):
        """Auto-calculate total dividend before saving."""
        self.total_dividend = self.dividend_per_share * self.stock.quantity
        super().save(*args, **kwargs)

    @property
    def per_member_share(self):
        """
        Calculate per-member dividend share.
        Simple equal split among active members.
        """
        from django.contrib.auth import get_user_model
        Member = get_user_model()
        active_members = Member.objects.filter(is_active=True).count()
        if active_members == 0:
            return 0
        return round(float(self.total_dividend) / active_members, 2)
