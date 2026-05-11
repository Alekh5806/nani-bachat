"""
PoolVest URL Configuration
"""
from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.messages.storage.fallback import FallbackStorage
from django.apps import apps
from django.test import RequestFactory
from django.urls import path, include
from django.http import JsonResponse
import traceback


def health_check(request):
    return JsonResponse({'status': 'ok', 'message': 'PoolVest API is running'})


@staff_member_required
def admin_diagnostics(request):
    """
    Staff-only production diagnostic for Django admin changelist failures.
    Remove after debugging the production-only 500.
    """
    checks = {}
    request_factory = RequestFactory()

    for model in apps.get_models():
        model_admin = admin.site._registry.get(model)
        if not model_admin:
            continue

        label = model._meta.label_lower
        admin_path = f'/admin/{model._meta.app_label}/{model._meta.model_name}/'
        admin_request = request_factory.get(admin_path)
        admin_request.user = request.user
        admin_request.session = request.session
        setattr(admin_request, '_messages', FallbackStorage(admin_request))

        try:
            queryset = model_admin.get_queryset(admin_request)
            count = queryset.count()
            list_display = list(model_admin.get_list_display(admin_request))
            changelist_response = model_admin.changelist_view(admin_request)
            checks[label] = {
                'ok': True,
                'count': count,
                'list_display': list_display,
                'changelist_status': getattr(changelist_response, 'status_code', None),
            }
        except Exception:
            checks[label] = {
                'ok': False,
                'admin_path': admin_path,
                'traceback': traceback.format_exc(),
            }

    return JsonResponse({'checks': checks})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('admin-diagnostics/', admin_diagnostics, name='admin-diagnostics'),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('accounts.urls')),
    path('api/investments/', include('investments.urls')),
    path('api/contributions/', include('contributions.urls')),
    path('api/dividends/', include('dividends.urls')),
    path('api/portfolio/', include('portfolio.urls')),
    path('api/reports/', include('reports.urls')),
]
