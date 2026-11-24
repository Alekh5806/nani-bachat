"""
Contribution models for PoolVest.
Tracks monthly ₹1000 contributions from each member.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal


class ActiveContributionManager(models.Manager):
    """Default manager: hides soft-deleted contributions from every normal query."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class Contribution(models.Model):
    """
    Monthly contribution record for each member.
    Default amount is ₹1000 per month.

    Deleting is a soft delete: deleted_at is set and the row stays in the
    database. Contribution.objects never returns deleted rows; use
    Contribution.all_objects to see them (for example to restore one). A member
    can have only one live row per month, but deleted rows do not count, so the
    month can be generated again after a delete.
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
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='New capital contributed this month. Drives ownership %.'
    )
    base_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('1000.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Standard monthly share before any buyer top-up.'
    )
    additional_payment = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'), db_default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Additional contribution paid above the scheduled installment.',
    )
    buyer_topup = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=(
            'Extra cash this member advanced from their own pocket because the '
            'month\'s share purchase cost more than the pool collected. It is '
            'reimbursed by reducing their next installment.'
        )
    )
    advance_credit = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=(
            'Reimbursement of an advance this member made in an earlier month. '
            'Subtracted from their standard share, so amount = base_amount - this.'
        )
    )
    carry_forward = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=(
            'Extra cash this member owes on top of their share, payable now but '
            'NOT new capital. Settlement no longer sets this: unspent pool money '
            'stays in the pool for the next purchase instead of being billed to '
            'the buyer. Left for an admin to record a one-off amount by hand.'
        )
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='unpaid'
    )
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    deleted_at = models.DateTimeField(
        null=True, blank=True, db_index=True,
        help_text='Set when the contribution is deleted; the row is kept so it can be restored.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ActiveContributionManager()
    all_objects = models.Manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['member', 'month'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_live_contribution_per_member_month',
            ),
        ]
        ordering = ['-month', 'member__name']
        verbose_name = 'Contribution'
        verbose_name_plural = 'Contributions'

    def __str__(self):
        return f'{self.member.name} - {self.month} - ₹{self.amount} ({self.status})'

    @property
    def scheduled_installment(self):
        return max(self.base_amount - self.advance_credit, Decimal('0.00')) + self.carry_forward

    @property
    def payable_amount(self):
        """Cash the member actually hands over: new capital + pool cash returned."""
        return (self.amount or Decimal('0.00')) + (self.carry_forward or Decimal('0.00'))


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
    total_invested = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00'),
        help_text='Actual cost of shares bought in this month, including brokerage.'
    )
    # Actual purchase funding below one rupee excluded from the buyer's credit.
    uncredited_paise = models.DecimalField(
        max_digits=2, decimal_places=2, default=Decimal('0.00'), db_default=Decimal('0.00'),
    )
    is_settled = models.BooleanField(
        default=False,
        help_text='True once the collected-vs-spent difference has been applied.'
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

    @property
    def difference(self):
        """Positive = unspent cash the buyer holds. Negative = buyer paid extra."""
        return (self.total_collected or Decimal('0.00')) - (self.total_invested or Decimal('0.00'))

    def update_totals(self):
        """Recalculate expected/collected/invested for this month."""
        rows = Contribution.objects.filter(month=self.month)
        self.total_expected = rows.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        self.total_collected = rows.filter(status='paid').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        self.total_invested = self._month_purchase_cost()
        self.is_complete = (
            self.total_expected > 0 and self.total_collected >= self.total_expected
        )
        self.save()

    def _month_purchase_cost(self):
        from investments.models import Stock

        total = Decimal('0.00')
        for stock in Stock.objects.filter(buy_date__startswith=self.month):
            total += stock.total_invested
        return total
