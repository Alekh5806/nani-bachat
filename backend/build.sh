#!/usr/bin/env bash
# Render build script
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed data only if no members exist
python manage.py shell -c "
from accounts.models import Member
if Member.objects.count() == 0:
    print('No members found, running seed_data...')
    from django.core.management import call_command
    call_command('seed_data')
else:
    print(f'Found {Member.objects.count()} members, skipping seed.')
"
