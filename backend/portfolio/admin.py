"""Admin configuration for portfolio app."""
from django.contrib import admin
from .models import PortfolioSnapshot


@admin.register(PortfolioSnapshot)
class PortfolioSnapshotAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'total_invested', 'total_current_value',
        'total_profit_loss', 'profit_loss_percentage'
    ]
    ordering = ['-date']
