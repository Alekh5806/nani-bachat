"""
Serializers for the accounts app.
Handles member registration, login, and profile data.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

Member = get_user_model()


class MemberSerializer(serializers.ModelSerializer):
    """Serializer for member profile data."""
    total_contribution = serializers.ReadOnlyField()
    ownership_percentage = serializers.ReadOnlyField()
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

    def get_current_value(self, obj):
        """Calculate member's current portfolio value."""
        from portfolio.services import PortfolioService
        member_portfolio = PortfolioService.get_member_portfolio(obj)
        return member_portfolio.get('current_value', 0)

    def get_profit_loss(self, obj):
        """Calculate member's profit/loss."""
        from portfolio.services import PortfolioService
        member_portfolio = PortfolioService.get_member_portfolio(obj)
        return member_portfolio.get('profit_loss', 0)

    def get_total_dividend(self, obj):
        """Calculate total dividends earned by this member."""
        from portfolio.services import PortfolioService
        member_portfolio = PortfolioService.get_member_portfolio(obj)
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
