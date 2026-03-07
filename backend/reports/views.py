"""Views for the reports app."""
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils import timezone

from .generators import generate_monthly_report


class MonthlyReportView(APIView):
    """Generate and download monthly PDF report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        month = request.query_params.get(
            'month',
            timezone.now().strftime('%Y-%m')
        )

        buffer = generate_monthly_report(month)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="PoolVest_Report_{month}.pdf"'
        )
        return response
