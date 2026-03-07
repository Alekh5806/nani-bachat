"""
Portfolio models for daily snapshots.
Tracks portfolio value over time for growth charts.
"""
from django.db import models
from decimal import Decimal


class PortfolioSnapshot(models.Model):
    """
    Daily snapshot of the entire portfolio value.
    Used for generating portfolio growth charts.
    """
    date = models.DateField(unique=True)
    total_invested = models.DecimalField(
        max_digits=14, decimal_places=2,
        default=Decimal('0.00')
    )
    total_current_value = models.DecimalField(
        max_digits=14, decimal_places=2,
        default=Decimal('0.00')
    )
    total_profit_loss = models.DecimalField(
        max_digits=14, decimal_places=2,
        default=Decimal('0.00')
    )
    profit_loss_percentage = models.DecimalField(
        max_digits=8, decimal_places=2,
        default=Decimal('0.00')
    )
    total_dividends = models.DecimalField(
        max_digits=14, decimal_places=2,
        default=Decimal('0.00')
    )
    member_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Portfolio Snapshot'
        verbose_name_plural = 'Portfolio Snapshots'

    def __str__(self):
        return f'{self.date} - ₹{self.total_current_value} ({self.profit_loss_percentage}%)'
