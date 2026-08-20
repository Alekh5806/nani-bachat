"""
Serializers for the investments app.
"""
from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers
from django.db import transaction
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

    @staticmethod
    def _purchase_total(quantity, buy_price, brokerage):
        return (buy_price * Decimal(quantity)) + brokerage

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = self.instance

        quantity = attrs.get('quantity', instance.quantity if instance else None)
        buy_price = attrs.get('buy_price', instance.buy_price if instance else None)
        brokerage = attrs.get('brokerage', instance.brokerage if instance else Decimal('0.00'))

        if quantity is None or buy_price is None:
            return attrs

        purchase_total = self._purchase_total(quantity, buy_price, brokerage)

        from portfolio.services import PortfolioService
        available_cash = Decimal(str(PortfolioService.get_portfolio_summary().get('cash_balance', 0)))
        if instance and not instance.is_sold:
            available_cash += instance.total_invested

        if purchase_total > available_cash:
            raise serializers.ValidationError({
                'non_field_errors': [
                    f'Insufficient pool cash. Available ₹{available_cash:.2f}, purchase needs ₹{purchase_total:.2f}.'
                ]
            })

        return attrs

    def create(self, validated_data):
        """Use buy price as the initial current price until live data is available."""
        validated_data.setdefault('current_price', validated_data.get('buy_price'))
        return super().create(validated_data)


class StockSellSerializer(serializers.ModelSerializer):
    """Serializer for recording a full or partial stock sale."""
    quantity = serializers.IntegerField(min_value=1)

    class Meta:
        model = Stock
        fields = ['quantity', 'sell_price', 'sell_date', 'notes']

    def validate(self, attrs):
        instance = self.instance
        quantity = attrs.get('quantity')
        sell_price = attrs.get('sell_price')
        sell_date = attrs.get('sell_date')

        if instance is None:
            raise serializers.ValidationError('Stock sale requires an existing stock purchase.')
        if instance.is_sold:
            raise serializers.ValidationError('This stock purchase is already sold.')
        if quantity is None:
            raise serializers.ValidationError({'quantity': 'Sell quantity is required.'})
        if quantity > instance.quantity:
            raise serializers.ValidationError({
                'quantity': f'Cannot sell {quantity} shares. Only {instance.quantity} shares are available.'
            })
        if sell_price is None:
            raise serializers.ValidationError({'sell_price': 'Sell price is required.'})
        if sell_price <= 0:
            raise serializers.ValidationError({'sell_price': 'Sell price must be greater than zero.'})
        if sell_date is None:
            raise serializers.ValidationError({'sell_date': 'Sell date is required.'})
        if sell_date < instance.buy_date:
            raise serializers.ValidationError({'sell_date': 'Sell date cannot be before buy date.'})

        return attrs

    @staticmethod
    def _split_brokerage(total_brokerage, sold_quantity, original_quantity):
        sold_brokerage = (
            total_brokerage
            * Decimal(sold_quantity)
            / Decimal(original_quantity)
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        remaining_brokerage = total_brokerage - sold_brokerage
        return sold_brokerage, remaining_brokerage

    def update(self, instance, validated_data):
        sell_quantity = validated_data['quantity']
        sell_price = validated_data['sell_price']
        sell_date = validated_data['sell_date']
        notes = validated_data.get('notes', instance.notes)

        with transaction.atomic():
            stock = Stock.objects.select_for_update().get(pk=instance.pk)
            if stock.is_sold:
                raise serializers.ValidationError('This stock purchase is already sold.')
            if sell_quantity > stock.quantity:
                raise serializers.ValidationError({
                    'quantity': f'Cannot sell {sell_quantity} shares. Only {stock.quantity} shares are available.'
                })

            original_quantity = stock.quantity
            if sell_quantity == original_quantity:
                stock.sell_price = sell_price
                stock.sell_date = sell_date
                stock.notes = notes
                stock.is_sold = True
                stock.save(update_fields=['sell_price', 'sell_date', 'notes', 'is_sold', 'updated_at'])
                return stock

            sold_brokerage, remaining_brokerage = self._split_brokerage(
                stock.brokerage,
                sell_quantity,
                original_quantity,
            )
            stock.quantity = original_quantity - sell_quantity
            stock.brokerage = remaining_brokerage
            stock.save(update_fields=['quantity', 'brokerage', 'updated_at'])

            sold_stock = Stock.objects.create(
                symbol=stock.symbol,
                name=stock.name,
                quantity=sell_quantity,
                buy_price=stock.buy_price,
                brokerage=sold_brokerage,
                buy_date=stock.buy_date,
                buyer=stock.buyer,
                notes=notes,
                current_price=stock.current_price,
                last_price_update=stock.last_price_update,
                is_sold=True,
                sell_price=sell_price,
                sell_date=sell_date,
            )
            return sold_stock


class StockPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for stock price history."""

    class Meta:
        model = StockPriceHistory
        fields = ['id', 'symbol', 'date', 'close_price']
