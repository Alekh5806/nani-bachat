"""URL patterns for the reports app."""
from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('monthly/', views.MonthlyReportView.as_view(), name='monthly-report'),
]
