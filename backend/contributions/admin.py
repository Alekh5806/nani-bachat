"""Admin configuration for contributions app."""
from django.contrib import admin
from .models import Contribution, MonthlyPool


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = [
        'member', 'month', 'base_amount', 'buyer_topup', 'advance_credit',
        'amount', 'carry_forward', 'payable_amount', 'status', 'paid_date',
    ]
    list_filter = ['status', 'month']
    search_fields = ['member__name']
    ordering = ['-month']


@admin.register(MonthlyPool)
class MonthlyPoolAdmin(admin.ModelAdmin):
    list_display = [
        'month', 'total_collected', 'total_expected', 'total_invested',
        'difference', 'buying_member', 'is_settled', 'is_complete',
    ]
    list_filter = ['is_complete', 'is_settled']
    ordering = ['-month']
