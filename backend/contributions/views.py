from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from datetime import datetime
from accounts.models import Member
from accounts.permissions import IsAdmin
from .models import Contribution
from .serializers import ContributionSerializer


class ContributionViewSet(viewsets.ModelViewSet):
    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        queryset = Contribution.objects.all().order_by('-month', 'member__name')

        if not user.is_staff and user.role != 'admin':
            queryset = queryset.filter(member=user)

        month = self.request.query_params.get('month')
        if month:
            queryset = queryset.filter(month=month)

        member_id = self.request.query_params.get('member_id')
        if member_id:
            queryset = queryset.filter(member_id=member_id)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        contribution = self.get_object()
        contribution.status = 'paid'
        contribution.paid_date = timezone.now().date()
        contribution.save()
        serializer = self.get_serializer(contribution)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_unpaid(self, request, pk=None):
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        contribution = self.get_object()
        contribution.status = 'unpaid'
        contribution.paid_date = None
        contribution.save()
        serializer = self.get_serializer(contribution)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_amount(self, request, pk=None):
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        contribution = self.get_object()
        amount = request.data.get('amount')
        if amount is None:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            contribution.amount = float(amount)
            contribution.save()
            serializer = self.get_serializer(contribution)
            return Response(serializer.data)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)


def parse_month(month_str):
    if not month_str:
        return None
    month_str = str(month_str).strip()
    if len(month_str) >= 10:
        return month_str[:7]
    if len(month_str) == 7:
        return month_str
    return None


def month_name(month_str):
    try:
        dt = datetime.strptime(str(month_str), '%Y-%m')
        return dt.strftime('%B %Y')
    except Exception:
        return str(month_str)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_monthly_contributions(request):
    if not (request.user.is_staff or request.user.role == 'admin'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    month_str = request.data.get('month')
    amount = request.data.get('amount', 1000)

    if month_str:
        target_month = parse_month(month_str)
        if not target_month:
            return Response(
                {'error': 'Invalid month format. Use YYYY-MM or YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        target_month = timezone.now().strftime('%Y-%m')

    active_members = Member.objects.filter(is_active=True)
    created_count = 0
    already_exists = 0

    for member in active_members:
        exists = Contribution.objects.filter(
            member=member,
            month=target_month
        ).exists()

        if not exists:
            Contribution.objects.create(
                member=member,
                month=target_month,
                amount=float(amount),
                status='unpaid'
            )
            created_count += 1
        else:
            already_exists += 1

    display = month_name(target_month)
    return Response({
        'message': 'Generated {} contributions for {}'.format(created_count, display),
        'created': created_count,
        'already_existed': already_exists,
        'month': display,
        'month_date': target_month
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_old_contributions(request):
    if not (request.user.is_staff or request.user.role == 'admin'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    month_str = request.data.get('month')

    if month_str:
        target_month = parse_month(month_str)
        if not target_month:
            return Response(
                {'error': 'Invalid month format. Use YYYY-MM or YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        old_unpaid = Contribution.objects.filter(month=target_month, status='unpaid')
    else:
        current_month = timezone.now().strftime('%Y-%m')
        old_unpaid = Contribution.objects.filter(month__lt=current_month, status='unpaid')

    deleted_count = old_unpaid.count()
    deleted_months = list(old_unpaid.values_list('month', flat=True).distinct().order_by('month'))
    month_names = [month_name(m) for m in deleted_months]
    old_unpaid.delete()

    return Response({
        'message': 'Removed {} unpaid contributions'.format(deleted_count),
        'deleted_count': deleted_count,
        'months_cleaned': month_names
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_month_contributions(request):
    if not (request.user.is_staff or request.user.role == 'admin'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    month_str = request.data.get('month')

    if not month_str:
        return Response(
            {'error': 'Month is required. Use YYYY-MM or YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    target_month = parse_month(month_str)
    if not target_month:
        return Response(
            {'error': 'Invalid month format. Use YYYY-MM or YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    contributions = Contribution.objects.filter(month=target_month)
    deleted_count = contributions.count()
    contributions.delete()

    display = month_name(target_month)
    return Response({
        'message': 'Deleted {} contributions for {}'.format(deleted_count, display),
        'deleted_count': deleted_count,
        'month': display
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contribution_summary(request):
    current_month = timezone.now().strftime('%Y-%m')

    current_month_contributions = Contribution.objects.filter(month=current_month)

    total_members = Member.objects.filter(is_active=True).count()
    paid_count = current_month_contributions.filter(status='paid').count()
    unpaid_count = current_month_contributions.filter(status='unpaid').count()

    total_collected = Contribution.objects.filter(
        status='paid'
    ).aggregate(total=Sum('amount'))['total'] or 0

    current_month_collected = current_month_contributions.filter(
        status='paid'
    ).aggregate(total=Sum('amount'))['total'] or 0

    display = month_name(current_month)
    return Response({
        'current_month': display,
        'total_members': total_members,
        'paid_count': paid_count,
        'unpaid_count': unpaid_count,
        'total_collected_all_time': float(total_collected),
        'current_month_collected': float(current_month_collected),
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_months(request):
    months = Contribution.objects.values_list('month', flat=True).distinct().order_by('-month')

    month_data = []
    for month in months:
        total = Contribution.objects.filter(month=month).count()
        paid = Contribution.objects.filter(month=month, status='paid').count()
        unpaid = Contribution.objects.filter(month=month, status='unpaid').count()
        total_amount = Contribution.objects.filter(
            month=month, status='paid'
        ).aggregate(total=Sum('amount'))['total'] or 0

        month_data.append({
            'month': month,
            'month_name': month_name(month),
            'total': total,
            'paid': paid,
            'unpaid': unpaid,
            'collected': float(total_amount),
        })

    return Response(month_data)
