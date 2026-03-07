"""Serializers for the contributions app."""
from rest_framework import serializers
from .models import Contribution, MonthlyPool


class ContributionSerializer(serializers.ModelSerializer):
    """Serializer for contribution records."""
    member_name = serializers.CharField(source='member.name', read_only=True)

    class Meta:
        model = Contribution
        fields = [
            'id', 'member', 'member_name', 'month', 'amount',
            'status', 'paid_date', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContributionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating contribution status."""

    class Meta:
        model = Contribution
        fields = ['status', 'amount', 'paid_date', 'notes']


class MonthlyPoolSerializer(serializers.ModelSerializer):
    """Serializer for monthly pool summary."""
    buying_member_name = serializers.CharField(
        source='buying_member.name', read_only=True
    )
    contributions = serializers.SerializerMethodField()
    collection_percentage = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyPool
        fields = [
            'id', 'month', 'total_expected', 'total_collected',
            'buying_member', 'buying_member_name', 'is_complete',
            'notes', 'contributions', 'collection_percentage',
        ]

    def get_contributions(self, obj):
        """Get all contributions for this month."""
        contributions = Contribution.objects.filter(month=obj.month)
        return ContributionSerializer(contributions, many=True).data

    def get_collection_percentage(self, obj):
        """Calculate collection percentage."""
        if obj.total_expected == 0:
            return 0
        return round(
            (float(obj.total_collected) / float(obj.total_expected)) * 100, 1
        )
