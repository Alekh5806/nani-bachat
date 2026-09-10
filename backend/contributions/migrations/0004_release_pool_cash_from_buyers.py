"""
Unspent pool cash is no longer billed to the month's buyer.

Settlement used to hand the leftover to whoever placed the order and add it to
their next installment. It is pool money, so it now simply stays in the pot and
funds the next purchase. Rows written under the old rule still carry that
charge, and leaving them would bill a member for cash the ledger is already
counting as available - so they are cleared here.
"""
from decimal import Decimal

from django.db import migrations


def clear_settlement_carry_forward(apps, schema_editor):
    Contribution = apps.get_model('contributions', 'Contribution')
    Contribution.objects.exclude(carry_forward=Decimal('0.00')).update(
        carry_forward=Decimal('0.00')
    )


def noop_reverse(apps, schema_editor):
    """
    Not reversible in any meaningful way.

    The old values were derived from each month's shortfall, so re-settling the
    affected months under the old rule would recreate them; nothing is stored
    here that could restore them directly.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('contributions', '0003_contribution_advance_credit_and_more'),
    ]

    operations = [
        migrations.RunPython(clear_settlement_carry_forward, noop_reverse),
    ]
