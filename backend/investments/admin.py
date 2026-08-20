"""Admin configuration for investments app."""
from django.contrib import admin
from .models import Stock, StockPriceHistory


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'name', 'quantity', 'buy_price', 'current_price', 'buy_date', 'buyer', 'is_sold', 'sell_price', 'sell_date']
    list_filter = ['is_sold', 'symbol', 'buy_date', 'sell_date', 'buyer']
    search_fields = ['symbol', 'name', 'buyer__name', 'buyer__phone']
    ordering = ['-buy_date']
    fieldsets = (
        ('Purchase', {
            'fields': ('symbol', 'name', 'quantity', 'buy_price', 'brokerage', 'buy_date', 'buyer', 'notes')
        }),
        ('Market Price', {
            'fields': ('current_price', 'last_price_update')
        }),
        ('Sale', {
            'fields': ('is_sold', 'sell_price', 'sell_date')
        }),
    )


@admin.register(StockPriceHistory)
class StockPriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'date', 'close_price']
    list_filter = ['symbol']
    ordering = ['-date']
