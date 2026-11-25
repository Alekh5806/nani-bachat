import { fmtFull } from './currency';

export const hasNumber = (value) => value != null && value !== '' && Number.isFinite(Number(value));
export const money = (value) => hasNumber(value) ? fmtFull(value) : '—';
export const percent = (value, digits = 2) => hasNumber(value) ? `${Number(value).toFixed(digits)}%` : '—';

const plus = (value, digits) => Number(value) >= 0.5 * 10 ** -digits ? '+' : '';
export const signedMoney = (value) => hasNumber(value) ? `${plus(value, 2)}${money(value)}` : '—';
export const signedPercent = (value) => hasNumber(value) ? `${plus(value, 2)}${percent(value)}` : '—';
export const returnRate = (amount, basis) =>
  hasNumber(amount) && hasNumber(basis) && basis > 0 ? (amount / basis) * 100 : null;

export const returnText = (amount, rate) =>
  hasNumber(rate) ? `${signedMoney(amount)} (${signedPercent(rate)})` : signedMoney(amount);

export const tickerLabel = (symbol) => symbol?.replace(/\.(NS|BO)$/i, '') || '';
export const sharesLabel = (quantity) => `${quantity} ${Number(quantity) === 1 ? 'share' : 'shares'}`;

export function quoteTime(value) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return null;
  const options = { timeZone: 'Asia/Kolkata' };
  const day = date.toLocaleDateString('en-IN', { ...options, day: 'numeric', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-IN', { ...options, hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}, ${time.toUpperCase()} IST`;
}

export function priceStatus(holdings) {
  if (!holdings.length) return null;
  const timestamps = holdings.filter((holding) => holding.quote_at)
    .map((holding) => new Date(holding.quote_at).getTime()).filter(Number.isFinite);
  if (timestamps.length === holdings.length) {
    const oldest = quoteTime(Math.min(...timestamps));
    const newest = quoteTime(Math.max(...timestamps));
    return oldest === newest ? `Quotes as of ${oldest}` : `Oldest quote: ${oldest}`;
  }
  if (holdings.some((holding) => holding.price_is_estimate)) return 'Includes estimates at purchase prices';
  if (timestamps.length) return 'Quote times available for some holdings';
  const checked = holdings.map((holding) => holding.last_updated).filter(Boolean)
    .map((date) => new Date(date).getTime()).filter(Number.isFinite);
  return checked.length === holdings.length
    ? `Last checked ${quoteTime(Math.min(...checked))} · Quote time unavailable`
    : 'Quote time unavailable';
}
