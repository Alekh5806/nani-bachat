"""
Contribution models for PoolVest.
Tracks monthly ₹1000 contributions from each member.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class Contribution(models.Model):
    """
    Monthly contribution record for each member.
    Default amount is ₹1000 per month.
    """
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
    ]

    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contributions'
    )
    month = models.CharField(
        max_length=7,
        help_text='Month in YYYY-MM format (e.g., 2026-03)'
    )
    amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('1000.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='unpaid'
    )
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['member', 'month']
        ordering = ['-month', 'member__name']
        verbose_name = 'Contribution'
        verbose_name_plural = 'Contributions'

    def __str__(self):
        return f'{self.member.name} - {self.month} - ₹{self.amount} ({self.status})'


class MonthlyPool(models.Model):
    """
    Aggregated monthly pool summary.
    Total collected, total expected, buying member for that month.
    """
    month = models.CharField(max_length=7, unique=True)
    total_expected = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('10000.00')
    )
    total_collected = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )
    buying_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='buying_months',
        help_text='Member whose demat account is used this month'
    )
    is_complete = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-month']
        verbose_name = 'Monthly Pool'
        verbose_name_plural = 'Monthly Pools'

    def __str__(self):
        return f'{self.month} - ₹{self.total_collected}/₹{self.total_expected}'

    def update_totals(self):
        """Recalculate total collected from contributions."""
        total = Contribution.objects.filter(
            month=self.month, status='paid'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        self.total_collected = total
        self.is_complete = (total >= self.total_expected)
        self.save()
