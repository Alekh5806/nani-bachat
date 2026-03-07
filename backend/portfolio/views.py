"""
Views for the portfolio app.
Dashboard data, portfolio summary, and growth charts.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

from .models import PortfolioSnapshot
from .serializers import PortfolioSnapshotSerializer
from .services import PortfolioService, StockPriceService
from .tasks import update_all_stock_prices
from accounts.permissions import IsAdmin

Member = get_user_model()


class DashboardView(APIView):
    """
    Main dashboard endpoint.
    Returns all data needed for the dashboard screen.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Portfolio summary
        portfolio = PortfolioService.get_portfolio_summary()

        # Member's personal portfolio
        member_portfolio = PortfolioService.get_member_portfolio(request.user)

        # Stock allocation for pie chart
        allocation = PortfolioService.get_allocation_data()

        # Member count
        active_members = Member.objects.filter(is_active=True).count()

        # Recent growth data (last 30 snapshots)
        growth_data = PortfolioSnapshotSerializer(
            PortfolioSnapshot.objects.all()[:30],
            many=True
        ).data

        return Response({
            'portfolio': portfolio,
            'my_portfolio': member_portfolio,
            'allocation': allocation,
            'active_members': active_members,
            'growth_data': growth_data,
        })


class PortfolioSummaryView(APIView):
    """Get overall portfolio summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PortfolioService.get_portfolio_summary())


class MemberPortfolioView(APIView):
    """Get portfolio details for all members."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        members = Member.objects.filter(is_active=True)
        portfolios = [
            PortfolioService.get_member_portfolio(member)
            for member in members
        ]
        return Response(portfolios)


class StockPriceView(APIView):
    """Get current price for a stock symbol."""
    permission_classes = [IsAuthenticated]

    def get(self, request, symbol):
        price = StockPriceService.get_stock_price(symbol)
        if price:
            return Response(price)
        return Response(
            {'error': f'Could not fetch price for {symbol}'},
            status=status.HTTP_404_NOT_FOUND
        )


class StockHistoryView(APIView):
    """Get historical prices for a stock."""
    permission_classes = [IsAuthenticated]

    def get(self, request, symbol):
        period = request.query_params.get('period', '1y')
        history = StockPriceService.get_stock_history(symbol, period)
        return Response({
            'symbol': symbol,
            'period': period,
            'data': history,
        })


class PortfolioGrowthView(generics.ListAPIView):
    """Get portfolio growth data for charts."""
    serializer_class = PortfolioSnapshotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        limit = self.request.query_params.get('limit', 90)
        return PortfolioSnapshot.objects.all()[:int(limit)]


class AllocationView(APIView):
    """Get stock allocation data for pie chart."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PortfolioService.get_allocation_data())


class RefreshPricesView(APIView):
    """Manually trigger stock price update (admin only)."""
    permission_classes = [IsAdmin]

    def post(self, request):
        # Run synchronously (no Celery/Redis needed)
        # Call the task function directly instead of .delay()
        try:
            result = update_all_stock_prices()
            return Response({'message': result or 'Prices updated successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to update prices: {str(e)}'},
                status=500
            )


class StockSearchView(APIView):
    """
    Search for Indian stocks on NSE/BSE via Yahoo Finance.
    Returns matching stocks with live prices.
    Like MoneyControl Pro search.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({'results': [], 'message': 'Enter at least 2 characters'})

        import yfinance as yf

        # Popular NSE stocks database for quick matching
        NSE_STOCKS = {
            'TCS': ('Tata Consultancy Services', 'TCS.NS'),
            'RELIANCE': ('Reliance Industries', 'RELIANCE.NS'),
            'HDFCBANK': ('HDFC Bank', 'HDFCBANK.NS'),
            'INFY': ('Infosys', 'INFY.NS'),
            'WIPRO': ('Wipro', 'WIPRO.NS'),
            'ICICIBANK': ('ICICI Bank', 'ICICIBANK.NS'),
            'SBIN': ('State Bank of India', 'SBIN.NS'),
            'BHARTIARTL': ('Bharti Airtel', 'BHARTIARTL.NS'),
            'ITC': ('ITC', 'ITC.NS'),
            'KOTAKBANK': ('Kotak Mahindra Bank', 'KOTAKBANK.NS'),
            'LT': ('Larsen & Toubro', 'LT.NS'),
            'AXISBANK': ('Axis Bank', 'AXISBANK.NS'),
            'HINDUNILVR': ('Hindustan Unilever', 'HINDUNILVR.NS'),
            'BAJFINANCE': ('Bajaj Finance', 'BAJFINANCE.NS'),
            'MARUTI': ('Maruti Suzuki', 'MARUTI.NS'),
            'TATAMOTORS': ('Tata Motors', 'TATAMOTORS.NS'),
            'SUNPHARMA': ('Sun Pharma', 'SUNPHARMA.NS'),
            'TITAN': ('Titan Company', 'TITAN.NS'),
            'NESTLEIND': ('Nestle India', 'NESTLEIND.NS'),
            'ULTRACEMCO': ('UltraTech Cement', 'ULTRACEMCO.NS'),
            'ASIANPAINT': ('Asian Paints', 'ASIANPAINT.NS'),
            'TECHM': ('Tech Mahindra', 'TECHM.NS'),
            'HCLTECH': ('HCL Technologies', 'HCLTECH.NS'),
            'POWERGRID': ('Power Grid', 'POWERGRID.NS'),
            'NTPC': ('NTPC', 'NTPC.NS'),
            'ADANIENT': ('Adani Enterprises', 'ADANIENT.NS'),
            'ADANIPORTS': ('Adani Ports', 'ADANIPORTS.NS'),
            'TATASTEEL': ('Tata Steel', 'TATASTEEL.NS'),
            'BAJAJFINSV': ('Bajaj Finserv', 'BAJAJFINSV.NS'),
            'ONGC': ('ONGC', 'ONGC.NS'),
            'JSWSTEEL': ('JSW Steel', 'JSWSTEEL.NS'),
            'M&M': ('Mahindra & Mahindra', 'M&M.NS'),
            'COALINDIA': ('Coal India', 'COALINDIA.NS'),
            'HDFCLIFE': ('HDFC Life Insurance', 'HDFCLIFE.NS'),
            'SBILIFE': ('SBI Life Insurance', 'SBILIFE.NS'),
            'DRREDDY': ('Dr. Reddy\'s Labs', 'DRREDDY.NS'),
            'CIPLA': ('Cipla', 'CIPLA.NS'),
            'DIVISLAB': ('Divi\'s Labs', 'DIVISLAB.NS'),
            'APOLLOHOSP': ('Apollo Hospitals', 'APOLLOHOSP.NS'),
            'EICHERMOT': ('Eicher Motors', 'EICHERMOT.NS'),
            'GRASIM': ('Grasim Industries', 'GRASIM.NS'),
            'INDUSINDBK': ('IndusInd Bank', 'INDUSINDBK.NS'),
            'BPCL': ('BPCL', 'BPCL.NS'),
            'HINDALCO': ('Hindalco', 'HINDALCO.NS'),
            'BRITANNIA': ('Britannia', 'BRITANNIA.NS'),
            'HEROMOTOCO': ('Hero MotoCorp', 'HEROMOTOCO.NS'),
            'TATACONSUM': ('Tata Consumer', 'TATACONSUM.NS'),
            'BAJAJ-AUTO': ('Bajaj Auto', 'BAJAJ-AUTO.NS'),
            'DABUR': ('Dabur India', 'DABUR.NS'),
            'PIDILITIND': ('Pidilite Industries', 'PIDILITIND.NS'),
            'ZOMATO': ('Zomato', 'ZOMATO.NS'),
            'PAYTM': ('Paytm (One97)', 'PAYTM.NS'),
            'IRCTC': ('IRCTC', 'IRCTC.NS'),
            'DMART': ('Avenue Supermarts', 'DMART.NS'),
            'HAL': ('Hindustan Aeronautics', 'HAL.NS'),
            'BEL': ('Bharat Electronics', 'BEL.NS'),
            'TRENT': ('Trent (Westside)', 'TRENT.NS'),
            'JIOFIN': ('Jio Financial Services', 'JIOFIN.NS'),
            'ETERNAL': ('Zomato (Eternal)', 'ETERNAL.NS'),
        }

        query_upper = query.upper()
        query_lower = query.lower()

        # Match against symbol and company name
        matches = []
        for sym_key, (name, full_symbol) in NSE_STOCKS.items():
            if query_upper in sym_key or query_lower in name.lower():
                matches.append({
                    'symbol': full_symbol,
                    'name': name,
                    'key': sym_key,
                })

        # If no matches in our list, try direct Yahoo Finance lookup
        if not matches:
            test_symbol = f"{query_upper}.NS"
            matches.append({
                'symbol': test_symbol,
                'name': query.title(),
                'key': query_upper,
            })

        # Limit to top 8 matches
        matches = matches[:8]

        # Fetch live prices for all matches
        results = []
        for match in matches:
            try:
                ticker = yf.Ticker(match['symbol'])
                info = ticker.fast_info
                price = float(getattr(info, 'last_price', 0) or 0)
                prev_close = float(getattr(info, 'previous_close', 0) or 0)
                day_high = float(getattr(info, 'day_high', 0) or 0)
                day_low = float(getattr(info, 'day_low', 0) or 0)
                market_cap = float(getattr(info, 'market_cap', 0) or 0)

                if price > 0:
                    change = price - prev_close if prev_close > 0 else 0
                    change_pct = (change / prev_close * 100) if prev_close > 0 else 0

                    results.append({
                        'symbol': match['symbol'],
                        'name': match['name'],
                        'current_price': round(price, 2),
                        'previous_close': round(prev_close, 2),
                        'day_high': round(day_high, 2),
                        'day_low': round(day_low, 2),
                        'change': round(change, 2),
                        'change_percentage': round(change_pct, 2),
                        'market_cap': round(market_cap / 10000000, 2),  # In Crores
                        'market_cap_label': f"₹{round(market_cap / 10000000, 0):,.0f} Cr",
                    })
            except Exception:
                # Skip stocks that fail to fetch
                continue

        return Response({
            'query': query,
            'results': results,
            'count': len(results),
        })
