"""Temporary production diagnostics for Django admin failures."""
import traceback

from django.http import HttpResponse


class StaffAdminTracebackMiddleware:
    """
    Return admin tracebacks only to logged-in staff users who request __trace=1.
    Remove this after the production-only admin 500 is fixed.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception:
            user = getattr(request, 'user', None)
            trace_requested = (
                request.GET.get('__trace') == '1'
                or request.headers.get('X-Admin-Trace') == '1'
            )
            can_trace = (
                request.path.startswith('/admin/')
                and trace_requested
                and getattr(user, 'is_staff', False)
            )
            if can_trace:
                return HttpResponse(
                    traceback.format_exc(),
                    status=500,
                    content_type='text/plain; charset=utf-8',
                )
            raise
