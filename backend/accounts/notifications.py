"""Expo push notification helpers for Nani Bachat."""
import random
import logging
import requests

from .models import PushToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
NOTIFICATION_TITLE = 'Nani Bachat'

PAYMENT_TITLES = [
    '💰 Payment Received!',
    '✅ Contribution Cleared!',
    '💸 Paisa Aa Gaya!',
]

STOCK_TITLES = [
    '📈 Stock Purchased!',
    '🟢 New Investment!',
    '🚀 Portfolio Updated!',
]

DIVIDEND_TITLES = [
    '🎉 Dividend Credited!',
    '💵 Passive Income Alert!',
    '✨ Dividend Bonus!',
]

PAYMENT_TEMPLATES = [
   
    '{member} નું payment આવી ગયું. Group ખુશ, admin relaxed.',
    '{member} એ paisa નાખી દીધા. Group માં ફરી શાંતિ સ્થાપિત થઈ.',
    '{member} નું contribution આવી ગયું. હવે reminder મોકલવાની જરૂર નથી!',
    '{member} એ payment કરી દીધું. Wallet બોલ્યું: thank you bhai.',
    '{member} ના પૈસા આવી ગયા. Nani Bachat માં ફરીથી oxygen આવી ગયો.',
    '{member} એ contribution કર્યું. હવે group admin ને ઊંઘ આવશે.',
    '{member} નું payment received. હવે “કાલે કરું છું” વાળો dialogue બંધ.',
    '{member} એ paisa group માં નાખ્યા. Financial sanskaar level: upgraded.',
    '{member} નું payment આવી ગયું. હવે portfolio ને પણ confidence આવશે.',
    '{member} એ contribution કરી દીધું. Group માં પૈસા, દિલમાં શાંતિ.',
    '{member} ના પૈસા આવી ગયા. Admin નું BP normal થયું.',
    '{member} એ payment કર્યું. Group માં respect +10 વધી ગઈ.',
    '{member} નું contribution આવ્યું. હવે બધા એને financially responsible બોલાવો.',
    '{member} એ પૈસા મોકલ્યા. Nani Bachat નો mood full paisa vasool.',
    '{member} નું payment received. હવે Excel sheet પણ ખુશ થઈ ગઈ.',

]

STOCK_TEMPLATES = [
   '{quantity} {symbol} shares buy થઈ ગયા. હવે ભગવાન અને bull market બંનેની કૃપા જોઈએ.',

    '{symbol} portfolio માં આવી ગયું. હવે chart ને zoom કરીને hope શોધવી.',

    '{quantity} {symbol} લીધા. હવે profit આવે તો genius, loss આવે તો long term investor.',

    'નવો stock entry: {symbol}. પૈસા market માં ગયા, હવે prayer mode ON.',

    '{symbol} buy થઈ ગયું. હવે candle green આવે તો party, red આવે તો silence.',

    '{quantity} {symbol} shares added. Portfolio બોલ્યું: welcome to risk zone.',

    '{symbol} portfolio માં આવ્યું. હવે રોજ 37 વખત price check કરવાનું શરૂ.',

    '{quantity} {symbol} buy કર્યું. હવે WhatsApp group માં expert analysis આવશે.',

    '{symbol} stock entry done. હવે market uncle mood માં રહે એ જરૂરી છે.',

    '{quantity} {symbol} shares buy. હવે “bas long term છે” બોલવાની તૈયારી રાખો.',

    '{symbol} portfolio માં add થયું. હવે green candle માટે collective prayer.',

    '{quantity} {symbol} shares આવ્યા. હવે market correction ને personal attack ન માનશો.',

    '{symbol} ખરીદી લીધું. હવે profit માટે patience અને loss માટે excuse જોઈએ.',

    'Stock buy alert: {symbol}. હવે બધા silently NSE app ખોલશે.',

    '{quantity} {symbol} shares buy થયા. હવે portfolio માં thodu masala આવી ગયું.',
]

DIVIDEND_TEMPLATES = [
    '{symbol} dividend આવ્યું. નાની ખુશી, મોટી investor wali feeling.',

    'Dividend credit! {symbol} એ થોડું પ્રેમ અને થોડા રૂપિયા મોકલ્યા.',

    '{symbol} તરફથી dividend. Chai-samosa fund officially upgraded.',

    '{symbol} dividend received. હવે બધા પોતાને Warren Buffett સમજે.',

    '{symbol} એ dividend આપ્યું. Portfolio માં today positive vibes only.',

    'Dividend આવ્યું from {symbol}. Free money જેવી feeling, પણ tax uncle જોઈ રહ્યો છે.',

    '{symbol} dividend credit થયું. હવે group માં financial happiness ફેલાવો.',

    '{symbol} એ dividend મોકલ્યું. Company બોલી: lo bhai, thodu enjoy karo.',

    'Dividend alert: {symbol}. નાની amount, પણ દિલ garden-garden.',

    '{symbol} તરફથી dividend આવ્યું. હવે એક cutting chai તો બને જ.',

    '{symbol} dividend received. Passive income નો trailer આવી ગયો.',

    '{symbol} એ dividend આપ્યું. Investor ego +5 વધ્યું.',

    'Dividend credit from {symbol}. Portfolio બોલ્યું: finally કંઈક તો આવ્યું.',

    '{symbol} dividend આવ્યું. Market loss વચ્ચે આ નાની mithai જેવી ખુશી.',

    '{symbol} તરફથી dividend. હવે group માં “compounding” શબ્દ 10 વખત વપરાશે.',
]


def _active_tokens():
    return list(
        PushToken.objects
        .filter(is_active=True, member__is_active=True)
        .values_list('token', flat=True)
        .distinct()
    )


def _send_push(body, data=None, title=None, channel_id='default'):
    tokens = _active_tokens()
    if not tokens:
        return {'sent': 0, 'reason': 'no_tokens'}

    messages = [
        {
            'to': token,
            'title': title or NOTIFICATION_TITLE,
            'body': body,
            'sound': 'default',
            'channelId': channel_id,
            'priority': 'high',
            'data': data or {},
        }
        for token in tokens
    ]

    try:
        response = requests.post(EXPO_PUSH_URL, json=messages, timeout=10)
        response.raise_for_status()
        payload = response.json()
        tickets = payload if isinstance(payload, list) else payload.get('data', [])
        errors = []

        for token, ticket in zip(tokens, tickets):
            if ticket.get('status') != 'error':
                continue

            details = ticket.get('details') or {}
            error = details.get('error') or ticket.get('message') or 'unknown'
            errors.append({'token': token, 'error': error})

            if error == 'DeviceNotRegistered':
                PushToken.objects.filter(token=token).update(is_active=False)

        if errors:
            logger.warning('Expo push ticket errors: %s', errors)

        return {
            'sent': len(messages) - len(errors),
            'failed': len(errors),
            'errors': errors,
            'response': payload,
        }
    except requests.RequestException as exc:
        logger.warning('Expo push send failed: %s', exc)
        return {'sent': 0, 'error': str(exc)}


def notify_payment_paid(contribution):
    body = random.choice(PAYMENT_TEMPLATES).format(
        member=contribution.member.name,
        amount=contribution.amount,
        month=contribution.month,
    )
    return _send_push(
        body,
        {
            'type': 'payment',
            'contribution_id': contribution.id,
            'member_id': contribution.member_id,
            'month': contribution.month,
        },
        title=random.choice(PAYMENT_TITLES),
        channel_id='payment',
    )


def notify_stock_bought(stock):
    symbol = stock.symbol.replace('.NS', '').replace('.BO', '')
    body = random.choice(STOCK_TEMPLATES).format(
        symbol=symbol,
        quantity=stock.quantity,
        buyer=stock.buyer.name if stock.buyer else '',
    )
    return _send_push(
        body,
        {
            'type': 'stock_bought',
            'stock_id': stock.id,
            'symbol': stock.symbol,
        },
        title=random.choice(STOCK_TITLES),
        channel_id='stock',
    )


def notify_dividend_recorded(dividend):
    symbol = dividend.stock.symbol.replace('.NS', '').replace('.BO', '')
    body = random.choice(DIVIDEND_TEMPLATES).format(
        symbol=symbol,
        amount=dividend.total_dividend,
    )
    return _send_push(
        body,
        {
            'type': 'dividend',
            'dividend_id': dividend.id,
            'stock_id': dividend.stock_id,
            'symbol': dividend.stock.symbol,
        },
        title=random.choice(DIVIDEND_TITLES),
        channel_id='dividend',
    )
