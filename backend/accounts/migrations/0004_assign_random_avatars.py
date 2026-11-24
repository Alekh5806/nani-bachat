"""Give every existing member a random avatar if they have none or an unknown one."""
import random

from django.db import migrations

AVATAR_KEYS = [f'avatar-{n}' for n in range(1, 15)]


def assign_avatars(apps, schema_editor):
    Member = apps.get_model('accounts', 'Member')
    members = list(Member.objects.all())
    used = {m.avatar for m in members if m.avatar in AVATAR_KEYS}
    for member in members:
        if member.avatar in AVATAR_KEYS:
            continue
        # Random, but prefer avatars no other member has yet.
        free = [key for key in AVATAR_KEYS if key not in used]
        member.avatar = random.choice(free or AVATAR_KEYS)
        used.add(member.avatar)
        member.save(update_fields=['avatar'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_member_avatar'),
    ]

    operations = [
        migrations.RunPython(assign_avatars, migrations.RunPython.noop),
    ]
