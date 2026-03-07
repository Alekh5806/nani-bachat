"""Views for the dividends app."""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.contrib.auth import get_user_model

from .models import Dividend
from .serializers import DividendSerializer, DividendCreateSerializer
from accounts.permissions import IsAdmin

Member = get_user_model()


class DividendListView(generics.ListAPIView):
    """List all dividends."""
    queryset = Dividend.objects.all()
    serializer_class = DividendSerializer
    permission_classes = [IsAuthenticated]


class DividendCreateView(generics.CreateAPIView):
    """Add a new dividend (admin only)."""
    serializer_class = DividendCreateSerializer
    permission_classes = [IsAdmin]


class DividendDetailView(generics.RetrieveAPIView):
    """Get dividend details."""
    queryset = Dividend.objects.all()
    serializer_class = DividendSerializer
    permission_classes = [IsAuthenticated]


class DividendUpdateView(generics.UpdateAPIView):
    """Update a dividend (admin only)."""
    queryset = Dividend.objects.all()
    serializer_class = DividendCreateSerializer
    permission_classes = [IsAdmin]


class DividendDeleteView(generics.DestroyAPIView):
    """Delete a dividend (admin only)."""
    queryset = Dividend.objects.all()
    permission_classes = [IsAdmin]


class DividendSummaryView(APIView):
    """Get dividend summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_dividends = Dividend.objects.aggregate(
            total=Sum('total_dividend')
        )['total'] or 0

        active_members = Member.objects.filter(is_active=True).count()
        per_member = round(float(total_dividends) / active_members, 2) if active_members > 0 else 0

        # Group by stock
        by_stock = {}
        for div in Dividend.objects.select_related('stock').all():
            symbol = div.stock.symbol
            if symbol not in by_stock:
                by_stock[symbol] = {
                    'symbol': symbol,
                    'name': div.stock.name,
                    'total_dividend': 0,
                    'count': 0,
                }
            by_stock[symbol]['total_dividend'] += float(div.total_dividend)
            by_stock[symbol]['count'] += 1

        return Response({
            'total_dividends': float(total_dividends),
            'per_member_share': per_member,
            'active_members': active_members,
            'by_stock': list(by_stock.values()),
            'total_entries': Dividend.objects.count(),
        })
