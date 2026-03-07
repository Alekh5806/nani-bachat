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

from .serializers import (
    MemberSerializer,
    MemberCreateSerializer,
    MemberUpdateSerializer,
    CustomTokenObtainPairSerializer,
    ChangePasswordSerializer,
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
