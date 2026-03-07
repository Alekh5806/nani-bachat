"""URL patterns for the contributions app."""
from django.urls import path
from . import views

app_name = 'contributions'

urlpatterns = [
    path('', views.ContributionListView.as_view(), name='contribution-list'),
    path('<int:pk>/update/', views.ContributionUpdateView.as_view(), name='contribution-update'),
    path('my/', views.MyContributionsView.as_view(), name='my-contributions'),
    path('generate/', views.GenerateMonthlyContributionsView.as_view(), name='generate-contributions'),
    path('summary/', views.ContributionSummaryView.as_view(), name='contribution-summary'),
    path('pools/', views.MonthlyPoolListView.as_view(), name='monthly-pool-list'),
    path('pools/<str:month>/', views.MonthlyPoolDetailView.as_view(), name='monthly-pool-detail'),
]
