"""
Serializers for the accounts app.
Handles member registration, login, and profile data.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import PushToken

Member = get_user_model()


class MemberSerializer(serializers.ModelSerializer):
    """Serializer for member profile data."""
    total_contribution = serializers.SerializerMethodField()
    ownership_percentage = serializers.SerializerMethodField()
    current_value = serializers.SerializerMethodField()
    profit_loss = serializers.SerializerMethodField()
    total_dividend = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            'id', 'name', 'phone', 'email', 'role', 'avatar_color',
            'is_active', 'date_joined', 'total_contribution',
            'ownership_percentage', 'current_value', 'profit_loss',
            'total_dividend',
        ]
        read_only_fields = ['id', 'date_joined']

    def _get_member_portfolio(self, obj):
        member_portfolios = self.context.get('member_portfolios')
        if member_portfolios is not None:
            return member_portfolios.get(obj.id, {})

        from portfolio.services import PortfolioService
        return PortfolioService.get_member_portfolio(obj)

    def get_total_contribution(self, obj):
        """Calculate member contribution, using precomputed list data when available."""
        member_portfolio = self._get_member_portfolio(obj)
        return member_portfolio.get('total_contribution', obj.total_contribution)

    def get_ownership_percentage(self, obj):
        """Calculate member ownership, using precomputed list data when available."""
        member_portfolio = self._get_member_portfolio(obj)
        return member_portfolio.get('ownership_percentage', obj.ownership_percentage)

    def get_current_value(self, obj):
        """Calculate member's current portfolio value."""
        member_portfolio = self._get_member_portfolio(obj)
        return member_portfolio.get('current_value', 0)

    def get_profit_loss(self, obj):
        """Calculate member's profit/loss."""
        member_portfolio = self._get_member_portfolio(obj)
        return member_portfolio.get('profit_loss', 0)

    def get_total_dividend(self, obj):
        """Calculate total dividends earned by this member."""
        member_portfolio = self._get_member_portfolio(obj)
        return member_portfolio.get('dividend_earned', 0)


class MemberCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new member."""
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = Member
        fields = ['id', 'name', 'phone', 'email', 'password', 'role', 'avatar_color']

    def create(self, validated_data):
        """Create member with hashed password."""
        return Member.objects.create_user(**validated_data)


class MemberUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating member info."""

    class Meta:
        model = Member
        fields = ['name', 'phone', 'email', 'avatar_color']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer that includes member info."""
    username_field = 'phone'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['name'] = user.name
        token['role'] = user.role
        token['phone'] = user.phone
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add member info to response
        data['member'] = MemberSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class PushTokenSerializer(serializers.ModelSerializer):
    """Serializer for registering Expo push tokens."""

    class Meta:
        model = PushToken
        fields = ['token', 'device_id', 'platform']

    def validate_token(self, value):
        value = str(value or '').strip()
        if not value.startswith('ExponentPushToken[') and not value.startswith('ExpoPushToken['):
            raise serializers.ValidationError('Invalid Expo push token')
        return value

    def create(self, validated_data):
        member = self.context['request'].user
        token = validated_data.pop('token')
        push_token, _ = PushToken.objects.update_or_create(
            token=token,
            defaults={
                'member': member,
                'is_active': True,
                **validated_data,
            }
        )
        return push_token
