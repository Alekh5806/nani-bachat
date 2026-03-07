"""
Stock investment models for PoolVest.
Tracks all stock purchases made by the pool.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Stock(models.Model):
    """
    Represents a stock holding in the pool's portfolio.
    Each entry is a purchase transaction.
    """
    symbol = models.CharField(
        max_length=20,
        help_text='NSE symbol with .NS suffix (e.g., TCS.NS)'
    )
    name = models.CharField(max_length=100, help_text='Company name')
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Number of shares purchased'
    )
    buy_price = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Price per share at purchase'
    )
    brokerage = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00'),
        help_text='Brokerage/commission paid'
    )
    buy_date = models.DateField(help_text='Date of purchase')
    notes = models.TextField(blank=True, default='')
    current_price = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00'),
        help_text='Latest market price (auto-updated)'
    )
    last_price_update = models.DateTimeField(null=True, blank=True)
    is_sold = models.BooleanField(default=False)
    sell_price = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True
    )
    sell_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-buy_date', 'symbol']
        verbose_name = 'Stock'
        verbose_name_plural = 'Stocks'

    def __str__(self):
        return f'{self.name} ({self.symbol}) - {self.quantity} shares'

    @property
    def total_invested(self):
        """Total cost including brokerage."""
        return (self.buy_price * self.quantity) + self.brokerage

    @property
    def current_value(self):
        """Current market value of this holding."""
        if self.is_sold:
            return self.sell_price * self.quantity if self.sell_price else 0
        return self.current_price * self.quantity

    @property
    def profit_loss(self):
        """Absolute profit/loss."""
        return float(self.current_value) - float(self.total_invested)

    @property
    def profit_loss_percentage(self):
        """Percentage profit/loss."""
        invested = float(self.total_invested)
        if invested == 0:
            return 0
        return round((self.profit_loss / invested) * 100, 2)

    @property
    def average_buy_price(self):
        """Average buy price including brokerage."""
        if self.quantity == 0:
            return 0
        return round(float(self.total_invested) / self.quantity, 2)


class StockPriceHistory(models.Model):
    """
    Tracks daily closing prices for portfolio growth chart.
    """
    symbol = models.CharField(max_length=20, db_index=True)
    date = models.DateField()
    close_price = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['symbol', 'date']
        ordering = ['-date']
        verbose_name = 'Price History'
        verbose_name_plural = 'Price Histories'

    def __str__(self):
        return f'{self.symbol} - ₹{self.close_price} on {self.date}'
