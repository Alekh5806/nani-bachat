"""URL patterns for the portfolio app."""
from django.urls import path
from . import views

app_name = 'portfolio'

urlpatterns = [
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('summary/', views.PortfolioSummaryView.as_view(), name='portfolio-summary'),
    path('members/', views.MemberPortfolioView.as_view(), name='member-portfolios'),
    path('price/<str:symbol>/', views.StockPriceView.as_view(), name='stock-price'),
    path('history/<str:symbol>/', views.StockHistoryView.as_view(), name='stock-history'),
    path('growth/', views.PortfolioGrowthView.as_view(), name='portfolio-growth'),
    path('allocation/', views.AllocationView.as_view(), name='allocation'),
    path('refresh-prices/', views.RefreshPricesView.as_view(), name='refresh-prices'),
    path('search-stocks/', views.StockSearchView.as_view(), name='stock-search'),
]
