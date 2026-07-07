"""
Views for the accounts app.
Handles authentication, registration, and member management.
"""
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Sum

from .serializers import (
    MemberSerializer,
    MemberCreateSerializer,
    MemberUpdateSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
    PushTokenSerializer,
)
from .permissions import IsAdmin

Member = get_user_model()


# ──────────────────────────────────────────────
# AUTHENTICATION VIEWS
# ──────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """Login endpoint - returns JWT tokens + member data."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RegisterView(generics.CreateAPIView):
    """Register a new member (admin only)."""
    serializer_class = MemberCreateSerializer
    permission_classes = [IsAdmin]


class LogoutView(APIView):
    """Logout - blacklist the refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {'message': 'Logged out successfully'},
                status=status.HTTP_200_OK
            )
        except Exception:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


# ──────────────────────────────────────────────
# MEMBER MANAGEMENT VIEWS
# ──────────────────────────────────────────────

class MemberListView(generics.ListAPIView):
    """List all members with their portfolio details."""
    queryset = Member.objects.filter(is_active=True)
    serializer_class = MemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        members = list(self.get_queryset())

        from contributions.models import Contribution
        from portfolio.services import PortfolioService

        portfolio = PortfolioService.get_portfolio_summary()
        active_count = len(members)
        contribution_rows = (
            Contribution.objects
            .filter(status='paid', member__in=members)
            .values('member_id')
            .annotate(total=Sum('amount'))
        )
        contributions = {
            row['member_id']: float(row['total'] or 0)
            for row in contribution_rows
        }
        total_pool = sum(contributions.values())

        member_portfolios = {}
        for member in members:
            contributed = contributions.get(member.id, 0)
            ownership = (contributed / total_pool) if total_pool > 0 else 0

            if ownership == 0 and active_count > 0:
                ownership = 1.0 / active_count

            current_value = round(portfolio['current_value'] * ownership, 2)
            invested = contributed
            if invested == 0 and ownership > 0:
                invested = round(portfolio['total_invested'] * ownership, 2)

            member_portfolios[member.id] = {
                'total_contribution': round(invested, 2),
                'ownership_percentage': round(ownership * 100, 2),
                'current_value': current_value,
                'profit_loss': round(current_value - invested, 2),
                'dividend_earned': round(portfolio['total_dividends'] * ownership, 2),
            }

        context['member_portfolios'] = member_portfolios
        return context


class MemberDetailView(generics.RetrieveAPIView):
    """Get details of a specific member."""
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    permission_classes = [permissions.IsAuthenticated]


class MemberUpdateView(generics.UpdateAPIView):
    """Update a member (admin only)."""
    queryset = Member.objects.all()
    serializer_class = MemberUpdateSerializer
    permission_classes = [IsAdmin]


class MemberDeleteView(generics.DestroyAPIView):
    """Deactivate a member (admin only, soft delete)."""
    queryset = Member.objects.all()
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        """Soft delete - deactivate instead of removing."""
        instance.is_active = False
        instance.save()
        return Response(
            {'message': f'{instance.name} has been deactivated'},
            status=status.HTTP_200_OK
        )


class ProfileView(APIView):
    """Get current user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = MemberSerializer(request.user)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """Change password for current user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Current password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PushTokenRegisterView(APIView):
    """Register the current device for Expo push notifications."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushTokenSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            push_token = serializer.save()
            return Response({
                'message': 'Push token registered',
                'id': push_token.id,
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
