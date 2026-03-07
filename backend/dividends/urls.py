"""URL patterns for the dividends app."""
from django.urls import path
from . import views

app_name = 'dividends'

urlpatterns = [
    path('', views.DividendListView.as_view(), name='dividend-list'),
    path('create/', views.DividendCreateView.as_view(), name='dividend-create'),
    path('summary/', views.DividendSummaryView.as_view(), name='dividend-summary'),
    path('<int:pk>/', views.DividendDetailView.as_view(), name='dividend-detail'),
    path('<int:pk>/update/', views.DividendUpdateView.as_view(), name='dividend-update'),
    path('<int:pk>/delete/', views.DividendDeleteView.as_view(), name='dividend-delete'),
]
