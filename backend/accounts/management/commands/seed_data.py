"""
Management command to seed the database with sample data.
Creates admin, members, stocks, contributions, and dividends.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import random

Member = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with sample data for development'

    def handle(self, *args, **options):
        self.stdout.write('🌱 Seeding database...\n')

        # ── Create Admin ──
        admin, created = Member.objects.get_or_create(
            phone='9925070999',
            defaults={
                'name': 'Alekh (Admin)',
                'role': 'admin',
                'email': 'admin@nanibachat.app',
                'avatar_color': '#4F46E5',
            }
        )
        if created:
            admin.set_password('admin123')
            admin.is_staff = True
            admin.is_superuser = True
            admin.save()
            self.stdout.write(self.style.SUCCESS('✅ Admin created: 9999999999 / admin123'))
        else:
            self.stdout.write('ℹ️  Admin already exists')

        # ── Create Members ──
        member_data = [
            {'name': 'Rahul Sharma', 'phone': '9876543210', 'avatar_color': '#0EA5E9'},
            {'name': 'Priya Patel', 'phone': '9876543211', 'avatar_color': '#8B5CF6'},
            {'name': 'Amit Kumar', 'phone': '9876543212', 'avatar_color': '#10B981'},
            {'name': 'Neha Gupta', 'phone': '9876543213', 'avatar_color': '#F59E0B'},
            {'name': 'Vikram Singh', 'phone': '9876543214', 'avatar_color': '#EF4444'},
            {'name': 'Anita Desai', 'phone': '9876543215', 'avatar_color': '#EC4899'},
            {'name': 'Rajesh Mehta', 'phone': '9876543216', 'avatar_color': '#06B6D4'},
            {'name': 'Sunita Reddy', 'phone': '9876543217', 'avatar_color': '#84CC16'},
            {'name': 'Karan Joshi', 'phone': '9876543218', 'avatar_color': '#F97316'},
        ]

        members = [admin]
        for data in member_data:
            member, created = Member.objects.get_or_create(
                phone=data['phone'],
                defaults={
                    'name': data['name'],
                    'role': 'member',
                    'avatar_color': data['avatar_color'],
                }
            )
            if created:
                member.set_password('member123')
                member.save()
                self.stdout.write(f'  ✅ Member: {data["name"]}')
            members.append(member)

        # ── Create Stocks ──
        from investments.models import Stock

        stock_data = [
            {
                'symbol': 'TCS.NS', 'name': 'Tata Consultancy Services',
                'quantity': 5, 'buy_price': Decimal('3800.00'),
                'brokerage': Decimal('20.00'), 'buy_date': date(2025, 10, 15),
                'current_price': Decimal('4100.00'),
            },
            {
                'symbol': 'RELIANCE.NS', 'name': 'Reliance Industries',
                'quantity': 8, 'buy_price': Decimal('2500.00'),
                'brokerage': Decimal('25.00'), 'buy_date': date(2025, 11, 5),
                'current_price': Decimal('2750.00'),
            },
            {
                'symbol': 'HDFCBANK.NS', 'name': 'HDFC Bank',
                'quantity': 12, 'buy_price': Decimal('1600.00'),
                'brokerage': Decimal('18.00'), 'buy_date': date(2025, 12, 10),
                'current_price': Decimal('1720.00'),
            },
            {
                'symbol': 'INFY.NS', 'name': 'Infosys',
                'quantity': 10, 'buy_price': Decimal('1550.00'),
                'brokerage': Decimal('15.00'), 'buy_date': date(2026, 1, 8),
                'current_price': Decimal('1680.00'),
            },
            {
                'symbol': 'WIPRO.NS', 'name': 'Wipro',
                'quantity': 15, 'buy_price': Decimal('450.00'),
                'brokerage': Decimal('12.00'), 'buy_date': date(2026, 2, 3),
                'current_price': Decimal('510.00'),
            },
        ]

        for data in stock_data:
            stock, created = Stock.objects.get_or_create(
                symbol=data['symbol'],
                buy_date=data['buy_date'],
                defaults=data
            )
            if created:
                self.stdout.write(f'  📈 Stock: {data["name"]}')

        # ── Create Contributions ──
        from contributions.models import Contribution, MonthlyPool

        months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
        for month in months:
            pool, _ = MonthlyPool.objects.get_or_create(
                month=month,
                defaults={'total_expected': Decimal('10000.00')}
            )

            for member in members:
                contrib, created = Contribution.objects.get_or_create(
                    member=member,
                    month=month,
                    defaults={
                        'amount': Decimal('1000.00'),
                        'status': 'paid' if month != '2026-03' else random.choice(['paid', 'unpaid']),
                        'paid_date': date.today() if month != '2026-03' else None,
                    }
                )
            pool.update_totals()
            if created:
                self.stdout.write(f'  💰 Contributions for {month}')

        # ── Create Dividends ──
        from dividends.models import Dividend

        stocks = Stock.objects.all()
        if stocks.exists():
            dividend_data = [
                {'stock': stocks.filter(symbol='TCS.NS').first(), 'dps': Decimal('75.00'), 'date': date(2026, 1, 15)},
                {'stock': stocks.filter(symbol='RELIANCE.NS').first(), 'dps': Decimal('10.00'), 'date': date(2026, 2, 20)},
                {'stock': stocks.filter(symbol='INFY.NS').first(), 'dps': Decimal('18.00'), 'date': date(2026, 1, 25)},
            ]

            for data in dividend_data:
                if data['stock']:
                    div, created = Dividend.objects.get_or_create(
                        stock=data['stock'],
                        ex_date=data['date'],
                        defaults={
                            'dividend_per_share': data['dps'],
                            'payment_date': data['date'] + timedelta(days=15),
                        }
                    )
                    if created:
                        self.stdout.write(f'  🎁 Dividend: {data["stock"].symbol}')

        # ── Create Portfolio Snapshots ──
        from portfolio.models import PortfolioSnapshot

        base_invested = 40000
        for i in range(90):
            snap_date = date.today() - timedelta(days=90-i)
            growth = 1 + (random.uniform(-0.02, 0.04) * (i / 90))
            value = base_invested * growth * (1 + i * 0.005)

            PortfolioSnapshot.objects.get_or_create(
                date=snap_date,
                defaults={
                    'total_invested': base_invested + (i * 200),
                    'total_current_value': round(value, 2),
                    'total_profit_loss': round(value - (base_invested + i * 200), 2),
                    'profit_loss_percentage': round(((value - (base_invested + i * 200)) / (base_invested + i * 200)) * 100, 2),
                    'total_dividends': 555 + (i * 5),
                    'member_count': 10,
                }
            )

        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
        self.stdout.write(self.style.WARNING('\n📌 Login Credentials:'))
        self.stdout.write(f'   Admin: 9925070999 / admin123')
        self.stdout.write(f'   Member: 9876543210 / member123')
