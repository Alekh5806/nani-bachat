"""
PDF Report Generator for PoolVest.
Generates monthly summary reports with portfolio details.
"""
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from django.contrib.auth import get_user_model
from investments.models import Stock
from contributions.models import Contribution
from dividends.models import Dividend
from portfolio.services import PortfolioService

Member = get_user_model()


def generate_monthly_report(month: str) -> io.BytesIO:
    """
    Generate a PDF monthly report.

    Args:
        month: Month in YYYY-MM format

    Returns:
        BytesIO buffer containing the PDF
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=20*mm, leftMargin=20*mm,
        topMargin=20*mm, bottomMargin=20*mm
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=15,
        spaceAfter=10,
    ))

    elements = []

    # ── Title ──
    elements.append(Paragraph('PoolVest Monthly Report', styles['CustomTitle']))
    elements.append(Paragraph(
        f'Report for: {month}',
        styles['Normal']
    ))
    elements.append(Paragraph(
        f'Generated: {datetime.now().strftime("%d %B %Y, %I:%M %p")}',
        styles['Normal']
    ))
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(
        width='100%', thickness=2,
        color=colors.HexColor('#4F46E5')
    ))
    elements.append(Spacer(1, 15))

    # ── Portfolio Summary ──
    elements.append(Paragraph('Portfolio Summary', styles['SectionHeader']))
    portfolio = PortfolioService.get_portfolio_summary()

    summary_data = [
        ['Metric', 'Value'],
        ['Total Invested', f'₹{portfolio["total_invested"]:,.2f}'],
        ['Current Value', f'₹{portfolio["current_value"]:,.2f}'],
        ['Profit/Loss', f'₹{portfolio["profit_loss"]:,.2f}'],
        ['Growth %', f'{portfolio["growth_percentage"]}%'],
        ['Total Dividends', f'₹{portfolio["total_dividends"]:,.2f}'],
    ]

    summary_table = Table(summary_data, colWidths=[200, 200])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F46E5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F1F5F9')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # ── Stock Holdings ──
    elements.append(Paragraph('Stock Holdings', styles['SectionHeader']))
    stocks = Stock.objects.filter(is_sold=False)

    if stocks.exists():
        stock_data = [['Stock', 'Qty', 'Buy Price', 'Current', 'P/L %']]
        for s in stocks:
            pnl_color = '#10B981' if s.profit_loss_percentage >= 0 else '#EF4444'
            stock_data.append([
                f'{s.name}\n({s.symbol})',
                str(s.quantity),
                f'₹{s.buy_price:,.2f}',
                f'₹{s.current_price:,.2f}',
                f'{s.profit_loss_percentage}%',
            ])

        stock_table = Table(stock_data, colWidths=[150, 50, 90, 90, 70])
        stock_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(stock_table)
    else:
        elements.append(Paragraph('No active stock holdings.', styles['Normal']))

    elements.append(Spacer(1, 20))

    # ── Member Contributions ──
    elements.append(Paragraph(f'Contributions - {month}', styles['SectionHeader']))
    contributions = Contribution.objects.filter(month=month).select_related('member')

    if contributions.exists():
        contrib_data = [['Member', 'Amount', 'Status']]
        for c in contributions:
            status_color = '#10B981' if c.status == 'paid' else '#EF4444'
            contrib_data.append([
                c.member.name,
                f'₹{c.amount:,.2f}',
                c.status.upper(),
            ])

        contrib_table = Table(contrib_data, colWidths=[200, 100, 100])
        contrib_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F766E')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0FDFA')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#99F6E4')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(contrib_table)
    else:
        elements.append(Paragraph(f'No contributions recorded for {month}.', styles['Normal']))

    elements.append(Spacer(1, 20))

    # ── Member Portfolio Breakdown ──
    elements.append(Paragraph('Member Portfolio Breakdown', styles['SectionHeader']))
    members = Member.objects.filter(is_active=True)

    if members.exists():
        member_data = [['Member', 'Contributed', 'Value', 'P/L', 'Own %']]
        for m in members:
            mp = PortfolioService.get_member_portfolio(m)
            member_data.append([
                m.name,
                f'₹{mp["total_contribution"]:,.2f}',
                f'₹{mp["current_value"]:,.2f}',
                f'₹{mp["profit_loss"]:,.2f}',
                f'{mp["ownership_percentage"]}%',
            ])

        member_table = Table(member_data, colWidths=[100, 90, 90, 90, 60])
        member_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7C3AED')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#FAF5FF')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDD6FE')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(member_table)

    # ── Footer ──
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(
        width='100%', thickness=1,
        color=colors.HexColor('#CBD5E1')
    ))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(
        'This report is auto-generated by PoolVest. '
        'For discrepancies, contact the admin.',
        ParagraphStyle(
            'Footer', parent=styles['Normal'],
            fontSize=8, textColor=colors.gray, alignment=TA_CENTER
        )
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
