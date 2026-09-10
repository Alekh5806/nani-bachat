from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContributionViewSet,
    generate_monthly_contributions,
    cleanup_old_contributions,
    delete_month_contributions,
    contribution_summary,
    available_months,
    pool_status,
    cash_handover,
    settle_pool_month,
    set_buying_member,
    sync_monthly_pools,
)

router = DefaultRouter()
router.register(r'', ContributionViewSet, basename='contribution')

urlpatterns = [
    path('generate/', generate_monthly_contributions, name='generate-contributions'),
    path('cleanup/', cleanup_old_contributions, name='cleanup-contributions'),
    path('delete-month/', delete_month_contributions, name='delete-month-contributions'),
    path('summary/', contribution_summary, name='contribution-summary'),
    path('months/', available_months, name='available-months'),
    path('pool-status/', pool_status, name='pool-status'),
    path('handover/', cash_handover, name='cash-handover'),
    path('settle/', settle_pool_month, name='settle-pool-month'),
    path('set-buyer/', set_buying_member, name='set-buying-member'),
    path('sync-pools/', sync_monthly_pools, name='sync-monthly-pools'),
    path('', include(router.urls)),
]