"""Serializers for the dividends app."""
from rest_framework import serializers
from .models import Dividend


class DividendSerializer(serializers.ModelSerializer):
    """Full dividend serializer."""
    stock_symbol = serializers.CharField(source='stock.symbol', read_only=True)
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    per_member_share = serializers.ReadOnlyField()

    class Meta:
        model = Dividend
        fields = [
            'id', 'stock', 'stock_symbol', 'stock_name',
            'dividend_per_share', 'total_dividend', 'per_member_share',
            'ex_date', 'payment_date', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_dividend', 'created_at', 'updated_at']


class DividendCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dividends."""

    class Meta:
        model = Dividend
        fields = ['stock', 'dividend_per_share', 'ex_date', 'payment_date', 'notes']
