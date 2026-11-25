"""
Views for the investments app.
Admin can add/edit/delete stock purchases. Members can view.
"""
from rest_framework import generics, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, F, DecimalField, Q
from django.db.models.functions import Coalesce

from .models import Stock, StockPriceHistory
from .serializers import (
    SaleEditSerializer, StockCreateSerializer, StockPriceHistorySerializer,
    StockSellSerializer, StockSerializer,
)
from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from portfolio.services import StockPriceService


class StockListView(generics.ListAPIView):
    """List all stock holdings (active + sold)."""
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Stock.objects.all()
        if 'dividend_ex_date' in self.request.query_params:
            day = serializers.DateField().run_validation(self.request.query_params['dividend_ex_date'])
            queryset = queryset.filter(buy_date__lt=day).filter(Q(is_sold=False) | Q(sell_date__gte=day))
        # Filter by active/sold
        is_sold = self.request.query_params.get('is_sold')
        if is_sold is not None:
            queryset = queryset.filter(is_sold=is_sold.lower() == 'true')
        # Filter by symbol
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)
        if is_sold and is_sold.lower() == 'true':
            return queryset.order_by('-sell_date', '-pk')
        return queryset


class StockCreateView(generics.CreateAPIView):
    """Add a new stock purchase (admin only)."""
    serializer_class = StockCreateSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        import logging
        logger = logging.getLogger(__name__)
        stock = serializer.save()
        try:
            from accounts.notifications import notify_stock_bought
            notify_stock_bought(stock)
        except Exception as exc:
            logger.warning('Push notification failed (stock create): %s', exc)


class StockDetailView(generics.RetrieveAPIView):
    """Get details of a specific stock."""
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]


class StockUpdateView(generics.UpdateAPIView):
    """Update a stock entry (admin only)."""
    queryset = Stock.objects.select_for_update().filter(is_sold=False)
    serializer_class = StockCreateSerializer
    permission_classes = [IsAdmin]

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


class StockSellView(generics.UpdateAPIView):
    """Mark a stock purchase as sold (admin only)."""
    queryset = Stock.objects.filter(is_sold=False)
    serializer_class = StockSellSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['patch', 'put', 'options']

    def perform_update(self, serializer):
        import logging
        logger = logging.getLogger(__name__)
        sold_stock = serializer.save()
        try:
            from accounts.notifications import notify_stock_sold
            notify_stock_sold(sold_stock)
        except Exception as exc:
            logger.warning('Push notification failed (stock sell): %s', exc)


class SaleEditView(generics.UpdateAPIView):
    """Correct the existing sale and its affected settlements atomically."""
    queryset = Stock.objects.select_for_update().filter(is_sold=True)
    serializer_class = SaleEditSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['patch', 'options']

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class StockDeleteView(generics.DestroyAPIView):
    """Delete a stock entry (admin only). Soft delete: the row is kept, hidden everywhere."""
    queryset = Stock.objects.all()
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at', 'updated_at'])


class StockSummaryView(generics.GenericAPIView):
    """Get aggregated stock summary grouped by symbol."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return consolidated view of all stocks grouped by symbol."""
        active_stocks = Stock.objects.filter(is_sold=False)
        symbols = active_stocks.order_by('symbol').values_list('symbol', flat=True).distinct()
        StockPriceService.refresh_in_background(list(symbols))

        summary = []
        for symbol in symbols:
            stocks = active_stocks.filter(symbol=symbol)
            total_qty = stocks.aggregate(total=Sum('quantity'))['total'] or 0
            total_invested = sum(float(s.total_invested) for s in stocks)
            first_stock = stocks.first()

            avg_price = total_invested / total_qty if total_qty > 0 else 0
            current_value = sum(float(s.current_price * s.quantity) for s in stocks)
            # Refreshes run in the background. A slow quote provider must never
            # prevent members from seeing the holdings already in the database.
            quote = cache.get(f'stock_price_{symbol}') or {}
            if quote.get('current_price', 0) > 0:
                current_value = total_qty * float(quote['current_price'])
            current_price = current_value / total_qty if total_qty else 0
            pnl = current_value - total_invested
            pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0
            day_change = quote.get('day_change', 0)
            day_change_pct = quote.get('day_change_percentage') or quote.get('day_change_pct') or 0
            day_change_value = day_change * total_qty

            summary.append({
                'symbol': symbol,
                'name': first_stock.name if first_stock else '',
                'total_quantity': total_qty,
                'average_buy_price': round(avg_price, 2),
                'total_invested': round(total_invested, 2),
                'current_price': current_price,
                'current_value': round(current_value, 2),
                'profit_loss': round(pnl, 2),
                'profit_loss_percentage': round(pnl_pct, 2),
                'day_change': round(day_change, 2),
                'day_change_percentage': round(day_change_pct, 2),
                'day_change_value': round(day_change_value, 2),
                'last_updated': first_stock.last_price_update if first_stock else None,
            })

        # Sort by current value descending
        summary.sort(key=lambda x: x['current_value'], reverse=True)

        return Response({
            'stocks': summary,
            'total_stocks': len(summary),
            'total_invested': round(sum(s['total_invested'] for s in summary), 2),
            'total_current_value': round(sum(s['current_value'] for s in summary), 2),
            'total_profit_loss': round(sum(s['profit_loss'] for s in summary), 2),
            'total_day_change': round(sum(s['day_change_value'] for s in summary), 2),
        })
