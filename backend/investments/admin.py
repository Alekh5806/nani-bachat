"""Admin configuration for investments app."""
from django.contrib import admin
from .models import Stock, StockPriceHistory


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'quantity', 'buy_price', 'current_price', 'buy_date', 'is_sold']
    list_filter = ['is_sold', 'symbol', 'buy_date']
    search_fields = ['symbol', 'name']
    ordering = ['-buy_date']


@admin.register(StockPriceHistory)
class StockPriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'date', 'close_price']
    list_filter = ['symbol']
    ordering = ['-date']
