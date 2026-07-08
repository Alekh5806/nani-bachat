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
        StockPriceService.refresh_active_stock_prices()

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
            'NSDL': ('National Securities Depository', 'NSDL.BO'),
        }

        query_upper = query.upper()
        query_lower = query.lower()

        matches = []

        def add_match(symbol, name, key=None):
            if not symbol:
                return
            symbol = symbol.upper().strip()
            if not symbol.endswith(('.NS', '.BO')):
                return
            if any(item['symbol'] == symbol for item in matches):
                return

            matches.append({
                'symbol': symbol,
                'name': name or symbol.replace('.NS', '').replace('.BO', ''),
                'key': key or symbol,
            })

        # Match against common local symbols first for fast, predictable results.
        for sym_key, (name, full_symbol) in NSE_STOCKS.items():
            if query_upper in sym_key or query_lower in name.lower():
                add_match(full_symbol, name, sym_key)

        # Ask Yahoo's search index so recent/listed stocks are not limited to our local list.
        try:
            import requests

            response = requests.get(
                'https://query2.finance.yahoo.com/v1/finance/search',
                params={
                    'q': query,
                    'quotesCount': 12,
                    'newsCount': 0,
                    'enableFuzzyQuery': 'true',
                },
                headers={'User-Agent': 'Mozilla/5.0'},
                timeout=10,
            )
            response.raise_for_status()

            for quote in response.json().get('quotes', []):
                symbol = quote.get('symbol', '')
                exchange = (quote.get('exchange') or quote.get('exchDisp') or '').upper()
                is_indian_stock = (
                    symbol.upper().endswith(('.NS', '.BO'))
                    or exchange in {'NSI', 'NSE', 'BSE', 'BOM'}
                )
                if is_indian_stock:
                    add_match(
                        symbol,
                        quote.get('shortname') or quote.get('longname') or quote.get('name'),
                    )
        except Exception:
            pass

        # Direct lookup catches exact symbols even when the search index is slow to update.
        if query_upper.endswith(('.NS', '.BO')):
            symbols_to_try = [query_upper]
        else:
            symbols_to_try = [f"{query_upper}.NS", f"{query_upper}.BO"]

        for test_symbol in symbols_to_try:
            add_match(test_symbol, query.title(), query_upper)

        # Limit quote lookups so Add Stock stays responsive.
        matches = matches[:12]

        # Fetch live prices for all matches
        results = []
        for match in matches:
            try:
                price_data = StockPriceService.get_stock_price(match['symbol'])
                if not price_data:
                    continue

                price = float(price_data.get('current_price', 0) or 0)
                prev_close = float(price_data.get('previous_close', 0) or 0)
                change = float(price_data.get('day_change', 0) or 0)
                change_pct = float(
                    price_data.get('day_change_percentage')
                    or price_data.get('day_change_pct')
                    or 0
                )

                if price > 0:
                    results.append({
                        'symbol': match['symbol'],
                        'name': price_data.get('name') or match['name'],
                        'current_price': round(price, 2),
                        'previous_close': round(prev_close, 2),
                        'day_high': round(price, 2),
                        'day_low': round(price, 2),
                        'change': round(change, 2),
                        'change_percentage': round(change_pct, 2),
                        'market_cap': 0,
                        'market_cap_label': 'N/A',
                    })
            except Exception:
                # Skip stocks that fail to fetch
                continue

        return Response({
            'query': query,
            'results': results,
            'count': len(results),
        })
