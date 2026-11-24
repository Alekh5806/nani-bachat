"""Serializers for the dividends app."""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from investments.models import Stock
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
            'dividend_per_share', 'received_quantity', 'total_dividend', 'per_member_share',
            'ex_date', 'payment_date', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_dividend', 'created_at', 'updated_at']


class DividendCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dividends."""
    submission_key = serializers.CharField(max_length=64, write_only=True, required=False)
    expected_quantity = serializers.IntegerField(min_value=1, write_only=True, required=False)

    class Meta:
        model = Dividend
        fields = ['stock', 'dividend_per_share', 'ex_date', 'payment_date', 'notes', 'expected_quantity', 'submission_key']
        extra_kwargs = {'dividend_per_share': {'min_value': Decimal('0.000001')}}

    def validate(self, attrs):
        instance = self.instance
        stock = attrs.get('stock', getattr(instance, 'stock', None))
        ex_date = attrs.get('ex_date', getattr(instance, 'ex_date', None))
        paid = attrs.get('payment_date', getattr(instance, 'payment_date', None))
        if not stock.qualifies_on_ex_date(ex_date):
            raise serializers.ValidationError({'stock': 'This lot did not qualify on the ex-dividend date.'})
        today = timezone.localdate()
        if ex_date > today or (paid and not ex_date <= paid <= today):
            raise serializers.ValidationError('Check the ex-date and actual payment date before recording income.')
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # A partial sale can split the selected lot while the form is open.
        stock = Stock.objects.select_for_update().filter(pk=validated_data['stock'].pk).first()
        expected = validated_data.pop('expected_quantity', None)
        key = validated_data.pop('submission_key', None)
        if key:
            prior = Dividend.objects.filter(submission_key=key).first()
            if prior:
                return self.replay(prior, validated_data)
        if (stock is None or not stock.qualifies_on_ex_date(validated_data['ex_date'])
                or (expected is not None and expected != stock.quantity)):
            raise serializers.ValidationError({'stock': 'The holding changed. Select an eligible lot.'})
        if stock.quantity * validated_data['dividend_per_share'] >= Decimal('9999999999.995'):
            raise serializers.ValidationError('The dividend exceeds the supported receipt amount.')
        validated_data['stock'] = stock
        self.created = True
        if key:
            receipt, self.created = Dividend.objects.get_or_create(submission_key=key, defaults=validated_data)
            return receipt if self.created else self.replay(receipt, validated_data)
        return super().create(validated_data)

    def replay(self, receipt, fields):
        if any(getattr(receipt, name) != value for name, value in fields.items()):
            raise serializers.ValidationError('This form already recorded a different payment. Check Dividend History.')
        self.created = False
        return receipt

    def update(self, instance, validated_data):
        validated_data.pop('submission_key', None)
        validated_data.pop('expected_quantity', None)
        if (validated_data.get('stock', instance.stock) != instance.stock or
                validated_data.get('ex_date', instance.ex_date) != instance.ex_date):
            instance.received_quantity = None
        return super().update(instance, validated_data)
