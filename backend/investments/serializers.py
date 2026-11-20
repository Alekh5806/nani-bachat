"""
Serializers for the investments app.
"""
from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
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
            'is_sold', 'sell_price', 'sell_brokerage', 'sell_date',
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
            # A buyer can front the shortfall from their own pocket; settling the
            # month credits it back to them as an extra contribution. Without a
            # named buyer there is nobody to charge the gap to, so block it.
            buyer = attrs.get('buyer', instance.buyer if instance else None)
            if buyer is None:
                shortfall = purchase_total - available_cash
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'Insufficient pool cash. Available ₹{available_cash:.2f}, '
                        f'purchase needs ₹{purchase_total:.2f} (short by ₹{shortfall:.2f}). '
                        f'Select the buying member who is covering the shortfall to continue.'
                    ]
                })

        return attrs

    def create(self, validated_data):
        """Use buy price as the initial current price until live data is available."""
        validated_data.setdefault('current_price', validated_data.get('buy_price'))
        return super().create(validated_data)


class SaleDetailsSerializer(serializers.ModelSerializer):
    """Terms shared by a recorded sale and a correction to that sale."""

    class Meta:
        model = Stock
        fields = ['sell_price', 'sell_brokerage', 'sell_date', 'notes']
        extra_kwargs = {
            'sell_price': {'allow_null': False, 'min_value': Decimal('0.01')},
            'sell_date': {'allow_null': False},
        }

    def validate(self, attrs):
        stock = self.instance
        price = attrs.get('sell_price', stock.sell_price)
        date = attrs.get('sell_date', stock.sell_date)
        quantity = attrs.get('quantity', stock.quantity)
        fee = attrs.get('sell_brokerage', stock.sell_brokerage)
        if price is None:
            raise serializers.ValidationError({'sell_price': 'Enter a sell price.'})
        if date is None or date < stock.buy_date or date > timezone.localdate():
            raise serializers.ValidationError({'sell_date': 'Choose a date from the purchase date through today.'})
        if fee > price * quantity:
            raise serializers.ValidationError({'sell_brokerage': 'Brokerage cannot exceed the gross sale value.'})
        return attrs


class SaleEditSerializer(SaleDetailsSerializer):
    def to_representation(self, instance):
        return StockSerializer(instance, context=self.context).data

    def validate(self, attrs):
        unsupported = set(self.initial_data) - set(self.fields)
        if unsupported:
            raise serializers.ValidationError({key: 'This field cannot be edited here.' for key in unsupported})
        return super().validate(attrs)

    def update(self, stock, validated_data):
        from contributions.models import MonthlyPool
        from contributions.services import PoolSettlementService

        old_date, old_proceeds = stock.sell_date, stock.net_sale_proceeds
        for key, value in validated_data.items():
            setattr(stock, key, value)
        stock.save(update_fields=[*validated_data, 'updated_at'])

        if (old_date, old_proceeds) != (stock.sell_date, stock.net_sale_proceeds):
            first_month = min(old_date or stock.sell_date, stock.sell_date).strftime('%Y-%m')
            months = MonthlyPool.objects.select_for_update().filter(
                is_settled=True, month__gte=first_month,
            ).order_by('month').values_list('month', flat=True)
            for month in list(months):
                try:
                    PoolSettlementService.settle_month(month, force=True)
                except ValueError as exc:
                    raise serializers.ValidationError(
                        f'Could not update the settlement for {month}. {exc}'
                    ) from exc
        return stock


class StockSellSerializer(SaleDetailsSerializer):
    """Serializer for recording a full or partial stock sale."""
    quantity = serializers.IntegerField(min_value=1)

    class Meta(SaleDetailsSerializer.Meta):
        fields = ['quantity', *SaleDetailsSerializer.Meta.fields]

    def validate(self, attrs):
        if self.instance is None:
            raise serializers.ValidationError('Stock sale requires an existing stock purchase.')
        if self.instance.is_sold:
            raise serializers.ValidationError('This stock purchase is already sold.')
        quantity = attrs.get('quantity')
        if quantity is None:
            raise serializers.ValidationError({'quantity': 'Sell quantity is required.'})
        if quantity > self.instance.quantity:
            raise serializers.ValidationError({
                'quantity': f'Cannot sell {quantity} shares. Only {self.instance.quantity} shares are available.'
            })
        return super().validate(attrs)

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
        sell_brokerage = validated_data.get('sell_brokerage', Decimal('0.00'))
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
                stock.sell_brokerage = sell_brokerage
                stock.sell_price = sell_price
                stock.sell_date = sell_date
                stock.notes = notes
                stock.is_sold = True
                stock.save(update_fields=['sell_price', 'sell_brokerage', 'sell_date', 'notes', 'is_sold', 'updated_at'])
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
                sell_brokerage=sell_brokerage,
                sell_date=sell_date,
            )
            return sold_stock


class StockPriceHistorySerializer(serializers.ModelSerializer):
    """Serializer for stock price history."""

    class Meta:
        model = StockPriceHistory
        fields = ['id', 'symbol', 'date', 'close_price']
