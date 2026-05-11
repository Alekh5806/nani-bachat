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
        return self.get_response(request)

    def process_exception(self, request, exception):
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
        if not can_trace:
            return None

        return HttpResponse(
            ''.join(traceback.format_exception(type(exception), exception, exception.__traceback__)),
            status=500,
            content_type='text/plain; charset=utf-8',
        )
