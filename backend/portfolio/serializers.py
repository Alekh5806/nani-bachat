"""Serializers for the portfolio app."""
from rest_framework import serializers
from .models import PortfolioSnapshot


class PortfolioSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for portfolio snapshots."""

    class Meta:
        model = PortfolioSnapshot
        fields = [
            'id', 'date', 'total_invested', 'total_current_value',
            'total_profit_loss', 'profit_loss_percentage',
            'total_dividends', 'member_count',
        ]
