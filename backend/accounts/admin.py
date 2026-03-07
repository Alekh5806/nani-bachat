"""Admin configuration for accounts app."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Member


@admin.register(Member)
class MemberAdmin(UserAdmin):
    """Admin view for Member model."""
    list_display = ['name', 'phone', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    search_fields = ['name', 'phone', 'email']
    ordering = ['name']

    fieldsets = (
        (None, {'fields': ('phone', 'password')}),
        ('Personal Info', {'fields': ('name', 'email', 'avatar_color')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone', 'name', 'password1', 'password2', 'role'),
        }),
    )
