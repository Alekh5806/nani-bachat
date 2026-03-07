"""URL patterns for the investments app."""
from django.urls import path
from . import views

app_name = 'investments'

urlpatterns = [
    path('stocks/', views.StockListView.as_view(), name='stock-list'),
    path('stocks/create/', views.StockCreateView.as_view(), name='stock-create'),
    path('stocks/summary/', views.StockSummaryView.as_view(), name='stock-summary'),
    path('stocks/<int:pk>/', views.StockDetailView.as_view(), name='stock-detail'),
    path('stocks/<int:pk>/update/', views.StockUpdateView.as_view(), name='stock-update'),
    path('stocks/<int:pk>/delete/', views.StockDeleteView.as_view(), name='stock-delete'),
]
