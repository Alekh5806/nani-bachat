"""Admin configuration for dividends app."""
from django.contrib import admin
from .models import Dividend


@admin.register(Dividend)
class DividendAdmin(admin.ModelAdmin):
    list_display = ['stock', 'dividend_per_share', 'total_dividend', 'ex_date']
    list_filter = ['ex_date', 'stock__symbol']
    ordering = ['-ex_date']
