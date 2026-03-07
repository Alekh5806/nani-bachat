"""
Member model for PoolVest.
Custom user model with phone, role (admin/member), and contribution tracking.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class MemberManager(BaseUserManager):
    """Custom manager for Member model."""

    def create_user(self, phone, name, password=None, **extra_fields):
        """Create and return a regular member."""
        if not phone:
            raise ValueError('Phone number is required')
        user = self.model(phone=phone, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, name, password=None, **extra_fields):
        """Create and return a superuser (admin)."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(phone, name, password, **extra_fields)


class Member(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model representing an investment pool member.
    Each member contributes ₹1000/month and owns an equal share.
    """

    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True, unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    avatar_color = models.CharField(max_length=7, default='#4F46E5')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = MemberManager()

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['name']

    class Meta:
        ordering = ['name']
        verbose_name = 'Member'
        verbose_name_plural = 'Members'

    def __str__(self):
        return f'{self.name} ({self.phone})'

    @property
    def is_admin(self):
        """Check if member has admin role."""
        return self.role == 'admin'

    @property
    def total_contribution(self):
        """Calculate total contribution from all paid contributions."""
        return self.contributions.filter(
            status='paid'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0

    @property
    def ownership_percentage(self):
        """
        Calculate ownership percentage based on contribution ratio.
        Each member's share = their total contribution / total pool contribution.
        """
        from contributions.models import Contribution
        total_pool = Contribution.objects.filter(
            status='paid'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or 0

        if total_pool == 0:
            return 0
        return round((self.total_contribution / total_pool) * 100, 2)
