"""
Serializers for the investments app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Stock, StockPriceHistory

Member = get_user_model()


class StockSerializer(serializers.ModelSerializer):
    """Full stock serializer with computed fields."""
    total_invested = serializers.ReadOnlyField()
    current_value = serializers.ReadOnlyField()
    profit_loss = serializers.ReadOnlyField()
    profit_loss_percentage = serializers.ReadOnlyField()
    average_buy_price = serializers.ReadOnlyField()
    buyer_name = serializers.SerializerMethodField()
    buyer_phone = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'symbol', 'name', 'quantity', 'buy_price', 'brokerage',
            'buy_date', 'buyer', 'buyer_name', 'buyer_phone', 'notes',
            'current_price', 'last_price_update',
            'is_sold', 'sell_price', 'sell_date',
            'total_invested', 'current_value', 'profit_loss',
            'profit_loss_percentage', 'average_buy_price',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'current_price', 'last_price_update', 'created_at', 'updated_at',
            'buyer_name', 'buyer_phone',
        ]

    def get_buyer_name(self, obj):
        return obj.buyer.name if obj.buyer else None

    def get_buyer_phone(self, obj):
        return obj.buyer.phone if obj.buyer else None


class StockCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating stock purchases."""
    buyer = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Stock
        fields = [
            'symbol', 'name', 'quantity', 'buy_price', 'brokerage',
            'buy_date', 'buyer', 'notes',
        ]

    def validate_symbol(self, value):
        """Normalize Indian stock symbols for Yahoo Finance."""
        value = value.upper().strip()
        if not value.endswith('.NS') and not value.endswith('.BO'):
            value = f'{value}.NS'
        return value

    def create(self, validated_data):
        """Use buy price as the initial current price until live data is available."""
        validated_data.setdefault('current_price', validated_data.get('buy_price'))
        return super().create(validated_data)


class StockPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for stock price history."""

    class Meta:
        model = StockPriceHistory
        fields = ['id', 'symbol', 'date', 'close_price']
