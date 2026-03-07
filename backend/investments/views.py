"""
Views for the investments app.
Admin can add/edit/delete stock purchases. Members can view.
"""
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, F, DecimalField
from django.db.models.functions import Coalesce

from .models import Stock, StockPriceHistory
from .serializers import StockSerializer, StockCreateSerializer, StockPriceHistorySerializer
from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from portfolio.services import StockPriceService


class StockListView(generics.ListAPIView):
    """List all stock holdings (active + sold)."""
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Stock.objects.all()
        # Filter by active/sold
        is_sold = self.request.query_params.get('is_sold')
        if is_sold is not None:
            queryset = queryset.filter(is_sold=is_sold.lower() == 'true')
        # Filter by symbol
        symbol = self.request.query_params.get('symbol')
        if symbol:
            queryset = queryset.filter(symbol__icontains=symbol)
        return queryset


class StockCreateView(generics.CreateAPIView):
    """Add a new stock purchase (admin only)."""
    serializer_class = StockCreateSerializer
    permission_classes = [IsAdmin]


class StockDetailView(generics.RetrieveAPIView):
    """Get details of a specific stock."""
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]


class StockUpdateView(generics.UpdateAPIView):
    """Update a stock entry (admin only)."""
    queryset = Stock.objects.all()
    serializer_class = StockCreateSerializer
    permission_classes = [IsAdmin]


class StockDeleteView(generics.DestroyAPIView):
    """Delete a stock entry (admin only)."""
    queryset = Stock.objects.all()
    permission_classes = [IsAdmin]


class StockSummaryView(generics.GenericAPIView):
    """Get aggregated stock summary grouped by symbol."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return consolidated view of all stocks grouped by symbol."""
        active_stocks = Stock.objects.filter(is_sold=False)
        symbols = active_stocks.values_list('symbol', flat=True).distinct()

        summary = []
        for symbol in symbols:
            stocks = active_stocks.filter(symbol=symbol)
            total_qty = stocks.aggregate(total=Sum('quantity'))['total'] or 0
            total_invested = sum(float(s.total_invested) for s in stocks)
            first_stock = stocks.first()

            avg_price = total_invested / total_qty if total_qty > 0 else 0
            current_price = float(first_stock.current_price) if first_stock else 0
            current_value = total_qty * current_price
            pnl = current_value - total_invested
            pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0

            # Get live day change from price service
            day_change = 0
            day_change_pct = 0
            try:
                price_data = StockPriceService.get_stock_price(symbol)
                if price_data:
                    day_change = price_data.get('day_change', 0)
                    day_change_pct = price_data.get('day_change_percentage', 0)
                    # Use live price if available
                    if price_data.get('current_price', 0) > 0:
                        current_price = price_data['current_price']
                        current_value = total_qty * current_price
                        pnl = current_value - total_invested
                        pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0
            except Exception:
                pass

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
