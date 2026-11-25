"""
Views for the investments app.
Admin can add/edit/delete stock purchases. Members can view.
"""
from collections import defaultdict
from decimal import Decimal

from rest_framework import generics, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.db.models import Q

from .models import Stock
from .serializers import (
    SaleEditSerializer, StockCreateSerializer,
    StockSellSerializer, StockSerializer,
)
from accounts.permissions import IsAdmin
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
        return queryset.order_by('-buy_date', 'symbol', '-pk')


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
    """Return open positions without waiting on the quote provider."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        groups = defaultdict(list)
        for stock in Stock.objects.filter(is_sold=False):
            groups[stock.symbol].append(stock)
        if groups:
            StockPriceService.refresh_in_background(sorted(groups))

        summary = []
        for symbol, lots in groups.items():
            latest = max(lots, key=lambda lot: (lot.last_price_update is not None, lot.last_price_update))
            quantity = sum(lot.quantity for lot in lots)
            invested = sum(lot.total_invested for lot in lots)
            quote_at = latest.market_quote_at
            fetched_at = latest.last_price_update
            previous_close = latest.previous_close
            value = sum(lot.current_value for lot in lots)
            quote = cache.get(f'stock_price_{symbol}') or {}
            cached_at = quote.get('quote_at')
            cached_fetch = quote.get('fetched_at')
            if (quote.get('current_price', 0) > 0 and
                    (not fetched_at or (cached_fetch and cached_fetch >= fetched_at)) and
                    (not quote_at or (cached_at and cached_at >= quote_at))):
                value = Decimal(str(quote['current_price'])) * quantity
                quote_at = cached_at
                fetched_at = cached_fetch
                previous_close = Decimal(str(quote.get('previous_close') or 0))
            elif latest.last_price_update and latest.current_price > 0:
                value = latest.current_price * quantity

            price = value / quantity if quantity else Decimal('0')
            pnl = value - invested
            change = price - previous_close if quote_at and previous_close and quantity else None
            summary.append({
                'symbol': symbol,
                'name': lots[0].name,
                'total_quantity': quantity,
                'average_buy_price': round(invested / quantity, 2) if quantity else 0,
                'total_invested': round(invested, 2),
                'current_price': round(price, 2),
                'current_value': round(value, 2),
                'profit_loss': round(pnl, 2),
                'profit_loss_percentage': round(pnl / invested * 100, 2) if invested > 0 else None,
                'day_change': round(change, 2) if change is not None else None,
                'day_change_percentage': round(change / previous_close * 100, 2) if change is not None else None,
                'day_change_value': round(change * quantity, 2) if change is not None else None,
                'last_updated': fetched_at,
                'quote_at': quote_at,
                'price_is_estimate': not fetched_at and not quote_at,
            })

        summary.sort(key=lambda row: (-row['current_value'], row['symbol']))
        session_dates = {timezone.localdate(row['quote_at']) for row in summary if row['quote_at']}
        day_change = None
        if len(session_dates) == 1 and all(row['day_change_value'] is not None for row in summary):
            day_change = sum(row['day_change_value'] for row in summary)

        return Response({
            'stocks': summary,
            'total_stocks': len(summary),
            'total_invested': sum(row['total_invested'] for row in summary),
            'total_current_value': sum(row['current_value'] for row in summary),
            'total_profit_loss': sum(row['profit_loss'] for row in summary),
            'total_day_change': day_change,
        })


class StockTransactionView(generics.GenericAPIView):
    """Expose purchases and sales independently, including closed positions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lots = list(Stock.objects.select_related('buyer', 'purchase_lot'))
        purchases = {lot.pk: lot for lot in lots if lot.purchase_lot_id is None}
        for lot in lots:
            if lot.purchase_lot_id and lot.purchase_lot.original_purchase:
                purchases.setdefault(lot.purchase_lot_id, lot.purchase_lot)

        events = []
        for lot in purchases.values():
            purchase = lot.original_purchase or {
                'symbol': lot.symbol,
                'name': lot.name,
                'date': lot.buy_date.isoformat(),
                'quantity': lot.quantity,
                'price': lot.buy_price,
                'brokerage': lot.brokerage,
                'amount': lot.total_invested,
                'buyer_name': lot.buyer.name if lot.buyer else None,
                'notes': '' if lot.is_sold else lot.notes,
            }
            events.append({
                **purchase,
                'id': lot.pk,
                'type': 'buy',
                'has_remaining_lot': not lot.is_sold and lot.deleted_at is None,
                'legacy': lot.is_sold and not lot.original_purchase,
            })

        for lot in lots:
            if lot.is_sold and lot.sell_date:
                events.append({
                    'id': lot.pk,
                    'type': 'sell',
                    'symbol': lot.symbol,
                    'name': lot.name,
                    'date': lot.sell_date.isoformat(),
                    'quantity': lot.quantity,
                    'price': lot.sell_price,
                    'brokerage': lot.sell_brokerage,
                    'amount': lot.net_sale_proceeds,
                    'cost_basis': lot.total_invested,
                    'profit_loss': lot.profit_loss,
                    'buy_date': lot.buy_date.isoformat(),
                    'buyer_name': lot.buyer.name if lot.buyer else None,
                    'notes': lot.notes,
                })

        events.sort(key=lambda event: (event['date'], event['type'] == 'sell', event['id']), reverse=True)
        page = self.paginate_queryset(events)
        if page is not None:
            return self.get_paginated_response(page)
        return Response(events)
