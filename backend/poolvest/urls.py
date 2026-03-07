"""
PoolVest URL Configuration
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/investments/', include('investments.urls')),
    path('api/contributions/', include('contributions.urls')),
    path('api/dividends/', include('dividends.urls')),
    path('api/portfolio/', include('portfolio.urls')),
    path('api/reports/', include('reports.urls')),
]
