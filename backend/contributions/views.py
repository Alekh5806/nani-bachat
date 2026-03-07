
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from datetime import datetime
from dateutil.relativedelta import relativedelta
from accounts.models import Member
from accounts.permissions import IsAdmin
from .models import Contribution
from .serializers import ContributionSerializer


class ContributionViewSet(viewsets.ModelViewSet):
    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Contribution.objects.all().order_by('-month', 'member__name')
        
        if not user.is_staff:
            try:
                member = Member.objects.get(user=user)
                queryset = queryset.filter(member=member)
            except Member.DoesNotExist:
                queryset = Contribution.objects.none()
        
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def mark_paid(self, request, pk=None):
        contribution = self.get_object()
        contribution.status = 'paid'
        contribution.paid_date = timezone.now().date()
        contribution.save()
        serializer = self.get_serializer(contribution)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def mark_unpaid(self, request, pk=None):
        contribution = self.get_object()
        contribution.status = 'unpaid'
        contribution.paid_date = None
        contribution.save()
        serializer = self.get_serializer(contribution)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdmin])
    def update_amount(self, request, pk=None):
        contribution = self.get_object()
        amount = request.data.get('amount')
        if amount is None:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            contribution.amount = float(amount)
            contribution.save()
            serializer = self.get_serializer(contribution)
            return Response(serializer.data)
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def generate_monthly_contributions(request):
    month_str = request.data.get('month')
    amount = request.data.get('amount', 1000)
    
    if month_str:
        try:
            target_month = datetime.strptime(month_str, '%Y-%m-%d').date().replace(day=1)
        except ValueError:
            try:
                target_month = datetime.strptime(month_str, '%Y-%m').date().replace(day=1)
            except ValueError:
                return Response(
                    {'error': 'Invalid month format. Use YYYY-MM-DD or YYYY-MM'},
                    status=status.HTTP_400_BAD_REQUEST
                )
    else:
        target_month = timezone.now().date().replace(day=1)

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

    return Response({
        'message': f'Generated {created_count} contributions for {target_month.strftime("%B %Y")}',
        'created': created_count,
        'already_existed': already_exists,
        'month': target_month.strftime('%B %Y'),
        'month_date': target_month.isoformat()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def cleanup_old_contributions(request):
    month_str = request.data.get('month')
    
    if month_str:
        try:
            target_month = datetime.strptime(month_str, '%Y-%m-%d').date().replace(day=1)
        except ValueError:
            try:
                target_month = datetime.strptime(month_str, '%Y-%m').date().replace(day=1)
            except ValueError:
                return Response(
                    {'error': 'Invalid month format. Use YYYY-MM-DD or YYYY-MM'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        old_unpaid = Contribution.objects.filter(month=target_month, status='unpaid')
    else:
        current_month = timezone.now().date().replace(day=1)
        old_unpaid = Contribution.objects.filter(month__lt=current_month, status='unpaid')

    deleted_count = old_unpaid.count()
    deleted_months = list(
        old_unpaid.values_list('month', flat=True).distinct().order_by('month')
    )
    month_names = [m.strftime('%B %Y') for m in deleted_months]
    old_unpaid.delete()

    return Response({
        'message': f'Removed {deleted_count} unpaid contributions',
        'deleted_count': deleted_count,
        'months_cleaned': month_names
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_month_contributions(request):
    month_str = request.data.get('month')
    
    if not month_str:
        return Response(
            {'error': 'Month is required. Use YYYY-MM-DD or YYYY-MM'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        target_month = datetime.strptime(month_str, '%Y-%m-%d').date().replace(day=1)
    except ValueError:
        try:
            target_month = datetime.strptime(month_str, '%Y-%m').date().replace(day=1)
        except ValueError:
            return Response(
                {'error': 'Invalid month format. Use YYYY-MM-DD or YYYY-MM'},
                status=status.HTTP_400_BAD_REQUEST
            )

    contributions = Contribution.objects.filter(month=target_month)
    deleted_count = contributions.count()
    contributions.delete()

    return Response({
        'message': f'Deleted {deleted_count} contributions for {target_month.strftime("%B %Y")}',
        'deleted_count': deleted_count,
        'month': target_month.strftime('%B %Y')
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contribution_summary(request):
    today = timezone.now().date()
    current_month = today.replace(day=1)

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

    return Response({
        'current_month': current_month.strftime('%B %Y'),
        'total_members': total_members,
        'paid_count': paid_count,
        'unpaid_count': unpaid_count,
        'total_collected_all_time': total_collected,
        'current_month_collected': current_month_collected,
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
            'month': month.isoformat(),
            'month_name': month.strftime('%B %Y'),
            'total': total,
            'paid': paid,
            'unpaid': unpaid,
            'collected': total_amount,
        })
    
    return Response(month_data)
