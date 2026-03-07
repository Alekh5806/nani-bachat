"""
Views for the contributions app.
Admin can manage contributions. Members can view their own.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum

from .models import Contribution, MonthlyPool
from .serializers import (
    ContributionSerializer,
    ContributionUpdateSerializer,
    MonthlyPoolSerializer,
)
from accounts.permissions import IsAdmin, IsAdminOrReadOnly

Member = get_user_model()


class ContributionListView(generics.ListAPIView):
    """List all contributions, filterable by member and month."""
    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Contribution.objects.all()
        member_id = self.request.query_params.get('member')
        month = self.request.query_params.get('month')
        status_filter = self.request.query_params.get('status')

        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if month:
            queryset = queryset.filter(month=month)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class ContributionUpdateView(generics.UpdateAPIView):
    """Update contribution status (admin only)."""
    queryset = Contribution.objects.all()
    serializer_class = ContributionUpdateSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        contribution = serializer.save()
        # Update monthly pool totals
        pool, _ = MonthlyPool.objects.get_or_create(month=contribution.month)
        pool.update_totals()


class MyContributionsView(generics.ListAPIView):
    """List current user's contributions."""
    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Contribution.objects.filter(member=self.request.user)


class MonthlyPoolListView(generics.ListAPIView):
    """List all monthly pool summaries."""
    queryset = MonthlyPool.objects.all()
    serializer_class = MonthlyPoolSerializer
    permission_classes = [IsAuthenticated]


class MonthlyPoolDetailView(generics.RetrieveAPIView):
    """Get details of a specific monthly pool."""
    queryset = MonthlyPool.objects.all()
    serializer_class = MonthlyPoolSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'month'


class GenerateMonthlyContributionsView(APIView):
    """Generate contribution records for a specific month (admin only)."""
    permission_classes = [IsAdmin]

    def post(self, request):
        month = request.data.get('month')
        if not month:
            # Default to current month
            month = timezone.now().strftime('%Y-%m')

        # Validate month format
        if len(month) != 7 or month[4] != '-':
            return Response(
                {'error': 'Month must be in YYYY-MM format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active members
        members = Member.objects.filter(is_active=True)
        created_count = 0

        for member in members:
            _, created = Contribution.objects.get_or_create(
                member=member,
                month=month,
                defaults={'amount': 1000, 'status': 'unpaid'}
            )
            if created:
                created_count += 1

        # Create or update monthly pool
        pool, _ = MonthlyPool.objects.get_or_create(
            month=month,
            defaults={'total_expected': members.count() * 1000}
        )
        pool.update_totals()

        return Response({
            'message': f'Generated {created_count} contribution records for {month}',
            'month': month,
            'total_members': members.count(),
            'new_records': created_count,
        })


class ContributionSummaryView(APIView):
    """Get overall contribution summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_collected = Contribution.objects.filter(
            status='paid'
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_pending = Contribution.objects.filter(
            status='unpaid'
        ).aggregate(total=Sum('amount'))['total'] or 0

        months = MonthlyPool.objects.count()

        return Response({
            'total_collected': float(total_collected),
            'total_pending': float(total_pending),
            'total_months': months,
            'active_members': Member.objects.filter(is_active=True).count(),
        })
