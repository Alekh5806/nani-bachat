"""
Serializers for the investments app.
"""
from rest_framework import serializers
from .models import Stock, StockPriceHistory


class StockSerializer(serializers.ModelSerializer):
    """Full stock serializer with computed fields."""
    total_invested = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()
    profit_loss = serializers.ReadOnlyField()
    profit_loss_percentage = serializers.ReadOnlyField()
    average_buy_price = serializers.ReadOnlyField()

    class Meta:
        model = Stock
        fields = [
            'id', 'symbol', 'name', 'quantity', 'buy_price', 'brokerage',
            'buy_date', 'notes', 'current_price', 'last_price_update',
            'is_sold', 'sell_price', 'sell_date',
            'total_invested', 'current_value', 'profit_loss',
            'profit_loss_percentage', 'average_buy_price',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'current_price', 'last_price_update', 'created_at', 'updated_at']


class StockCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating stock purchases."""

    class Meta:
        model = Stock
        fields = [
            'symbol', 'name', 'quantity', 'buy_price', 'brokerage',
            'buy_date', 'notes',
        ]

    def validate_symbol(self, value):
        """Ensure symbol has .NS suffix for NSE stocks."""
        value = value.upper().strip()
        if not value.endswith('.NS') and not value.endswith('.BO'):
            value = f'{value}.NS'
        return value


class StockPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for stock price history."""

    class Meta:
        model = StockPriceHistory
        fields = ['id', 'symbol', 'date', 'close_price']
