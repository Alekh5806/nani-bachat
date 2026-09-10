from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from datetime import datetime
from decimal import Decimal, InvalidOperation
from accounts.models import Member
from accounts.permissions import IsAdmin
from .models import Contribution, MonthlyPool
from .serializers import ContributionSerializer
from .services import PoolSettlementService, previous_month


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
        import logging
        logger = logging.getLogger(__name__)
        contribution = serializer.save()
        if contribution.status == 'paid':
            try:
                from accounts.notifications import notify_payment_paid
                notify_payment_paid(contribution)
            except Exception as exc:
                logger.warning('Push notification failed (create): %s', exc)

    def perform_update(self, serializer):
        import logging
        logger = logging.getLogger(__name__)
        old_status = None
        if serializer.instance:
            old_status = serializer.instance.status

        contribution = serializer.save()
        if old_status != 'paid' and contribution.status == 'paid':
            try:
                from accounts.notifications import notify_payment_paid
                notify_payment_paid(contribution)
            except Exception as exc:
                logger.warning('Push notification failed (update): %s', exc)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        if not (request.user.is_staff or request.user.role == 'admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        contribution = self.get_object()
        was_paid = contribution.status == 'paid'
        contribution.status = 'paid'
        contribution.paid_date = timezone.now().date()
        contribution.save()
        if not was_paid:
            try:
                from accounts.notifications import notify_payment_paid
                notify_payment_paid(contribution)
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning('Push notification failed (mark_paid): %s', exc)
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
            value = Decimal(str(amount))
            contribution.amount = value
            # An admin editing the amount is restating the member's own share,
            # so rebuild the baseline the settlement adjustments hang off.
            contribution.base_amount = (
                value
                + (contribution.advance_credit or Decimal('0.00'))
                - (contribution.buyer_topup or Decimal('0.00'))
            )
            contribution.save()
            serializer = self.get_serializer(contribution)
            return Response(serializer.data)
        except (ValueError, TypeError, InvalidOperation):
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

    # If last month's buyer is still holding unspent pool cash, bill it now.
    carried = {}
    prior = previous_month(target_month)
    prior_status = PoolSettlementService.get_month_status(prior)
    if prior_status['is_settled'] and prior_status['underspend'] > 0 and prior_status['buying_member']:
        carried[prior_status['buying_member']] = Decimal(
            str(prior_status['underspend'])
        )

    for member in active_members:
        exists = Contribution.objects.filter(
            member=member,
            month=target_month
        ).exists()

        if not exists:
            base = Decimal(str(amount))
            Contribution.objects.create(
                member=member,
                month=target_month,
                amount=base,
                base_amount=base,
                carry_forward=carried.get(member.id, Decimal('0.00')),
                status='unpaid'
            )
            created_count += 1
        else:
            already_exists += 1

    display = month_name(target_month)

    pool, _ = MonthlyPool.objects.get_or_create(month=target_month)
    pool.update_totals()

    return Response({
        'message': 'Generated {} contributions for {}'.format(created_count, display),
        'created': created_count,
        'already_existed': already_exists,
        'carried_forward': {
            str(member_id): float(value) for member_id, value in carried.items()
        },
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pool_status(request):
    """Collected vs actually-spent position for a month, and who owes the gap."""
    target_month = parse_month(
        request.query_params.get('month')
    ) or timezone.now().strftime('%Y-%m')

    data = PoolSettlementService.get_month_status(target_month)
    data['month_name'] = month_name(target_month)
    data['unsettled_months'] = PoolSettlementService.unsettled_months()
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def settle_pool_month(request):
    """
    Apply a month's collected-vs-spent difference to that month's buyer.

    Overspend becomes an extra contribution by the buyer (ownership % rises).
    Underspend is carried onto the buyer's next monthly bill.
    """
    if not (request.user.is_staff or request.user.role == 'admin'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    target_month = parse_month(request.data.get('month'))
    if not target_month:
        return Response(
            {'error': 'Invalid month format. Use YYYY-MM or YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    buyer = None
    buyer_id = request.data.get('buying_member')
    if buyer_id:
        buyer = Member.objects.filter(pk=buyer_id, is_active=True).first()
        if buyer is None:
            return Response(
                {'error': 'Buying member not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

    try:
        result = PoolSettlementService.settle_month(
            target_month,
            buying_member=buyer,
            force=bool(request.data.get('force')),
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    result['month_name'] = month_name(target_month)
    if result['overspend']:
        result['message'] = (
            '{} covered ₹{:.2f} extra for {}. It has been added to their '
            'contribution, so their ownership share goes up.'
        ).format(result['buying_member_name'], result['overspend'], result['month_name'])
    elif result['underspend']:
        result['message'] = (
            '{} is holding ₹{:.2f} of unspent pool cash from {}. It has been '
            'added to their next monthly payment.'
        ).format(result['buying_member_name'], result['underspend'], result['month_name'])
    else:
        result['message'] = '{} is fully settled.'.format(result['month_name'])

    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_buying_member(request):
    """Record whose demat account is used for a given month."""
    if not (request.user.is_staff or request.user.role == 'admin'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    target_month = parse_month(request.data.get('month'))
    if not target_month:
        return Response(
            {'error': 'Invalid month format. Use YYYY-MM or YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )

    buyer = Member.objects.filter(
        pk=request.data.get('buying_member'), is_active=True
    ).first()
    if buyer is None:
        return Response(
            {'error': 'Buying member not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    pool, _ = MonthlyPool.objects.get_or_create(month=target_month)
    pool.buying_member = buyer
    pool.save(update_fields=['buying_member'])
    pool.update_totals()

    return Response({
        'month': target_month,
        'month_name': month_name(target_month),
        'buying_member': buyer.id,
        'buying_member_name': buyer.name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_monthly_pools(request):
    """Rebuild the MonthlyPool rows from existing contributions and purchases."""
    if not (request.user.is_staff or request.user.role == 'admin'):
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    result = PoolSettlementService.sync_pools()
    return Response({
        'message': 'Synced {} pool(s), {} newly created'.format(
            len(result['created']) + len(result['updated']), len(result['created'])
        ),
        'created': result['created'],
        'updated': result['updated'],
    })
