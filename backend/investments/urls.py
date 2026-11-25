"""URL patterns for the investments app."""
from django.urls import path
from . import views
from .stock_news import stock_news
from .portfolio_news import portfolio_news

app_name = 'investments'

urlpatterns = [
    path('stocks/news/', stock_news, name='stock-news'),
    path('stocks/news/portfolio/', portfolio_news, name='portfolio-news'),
    path('stocks/', views.StockListView.as_view(), name='stock-list'),
    path('stocks/create/', views.StockCreateView.as_view(), name='stock-create'),
    path('stocks/summary/', views.StockSummaryView.as_view(), name='stock-summary'),
    path('stocks/transactions/', views.StockTransactionView.as_view(), name='stock-transactions'),
    path('stocks/<int:pk>/', views.StockDetailView.as_view(), name='stock-detail'),
    path('stocks/<int:pk>/update/', views.StockUpdateView.as_view(), name='stock-update'),
    path('stocks/<int:pk>/sell/', views.StockSellView.as_view(), name='stock-sell'),
    path('stocks/<int:pk>/sale/', views.SaleEditView.as_view(), name='sale-edit'),
    path('stocks/<int:pk>/delete/', views.StockDeleteView.as_view(), name='stock-delete'),
]
