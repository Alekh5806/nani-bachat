"""Admin configuration for contributions app."""
from django.contrib import admin
from .models import Contribution, MonthlyPool


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ['member', 'month', 'amount', 'status', 'paid_date']
    list_filter = ['status', 'month']
    search_fields = ['member__name']
    ordering = ['-month']


@admin.register(MonthlyPool)
class MonthlyPoolAdmin(admin.ModelAdmin):
    list_display = ['month', 'total_collected', 'total_expected', 'is_complete']
    list_filter = ['is_complete']
    ordering = ['-month']
