"""Admin configuration for accounts app."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Member, PushToken


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


@admin.register(PushToken)
class PushTokenAdmin(admin.ModelAdmin):
    list_display = ['member', 'platform', 'is_active', 'updated_at']
    list_filter = ['platform', 'is_active']
    search_fields = ['member__name', 'member__phone', 'token']
    readonly_fields = ['created_at', 'updated_at']
