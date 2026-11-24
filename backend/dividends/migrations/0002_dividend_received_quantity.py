from decimal import Decimal

from django.db import migrations, models


def snapshot_quantities(apps, schema_editor):
    Dividend = apps.get_model('dividends', 'Dividend')
    for receipt in Dividend.objects.using(schema_editor.connection.alias).select_related('stock').iterator(chunk_size=500):
        rate = receipt.dividend_per_share
        quantity = receipt.total_dividend / rate if rate else Decimal(receipt.stock.quantity)
        if quantity >= 0 and quantity == quantity.to_integral_value():
            receipt.received_quantity = int(quantity)
            receipt.save(update_fields=['received_quantity'])


class Migration(migrations.Migration):
    dependencies = [('dividends', '0001_initial')]
    operations = [
        migrations.AddField(model_name='dividend', name='received_quantity',
                            field=models.PositiveIntegerField(editable=False, null=True)),
        migrations.AddField(model_name='dividend', name='submission_key',
                            field=models.CharField(max_length=64, editable=False, null=True, unique=True)),
        migrations.RunPython(snapshot_quantities, migrations.RunPython.noop),
        migrations.AlterField(model_name='dividend', name='dividend_per_share',
                              field=models.DecimalField(max_digits=14, decimal_places=6,
                                                        help_text='Dividend amount per share')),
    ]
