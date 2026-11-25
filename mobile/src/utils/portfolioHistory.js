// Daily snapshots and dividend ex-dates are calendar dates in the club's time zone.
const DAY_MS = 86400000;
const clubDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});

export const todayInClub = (now = new Date()) => {
  const parts = clubDay.formatToParts(now);
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return [part('year'), part('month'), part('day')].join('-');
};

export const firstDayOfRange = (today, days) => days
  ? new Date(Date.parse(today) - (days - 1) * DAY_MS).toISOString().slice(0, 10)
  : null;

export const dateLabel = (date) => new Date(date).toLocaleDateString('en-IN', {
  timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
});

export const validDay = (day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)
  && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;

export const validAmount = (value) => (typeof value === 'number' || typeof value === 'string')
  && String(value).trim() !== '' && Number.isFinite(Number(value));

export function recordedPoints(snapshots, today) {
  const byDate = new Map();
  for (const row of Array.isArray(snapshots) ? snapshots : []) {
    if (!row || !validDay(row.date) || row.date > today || !validAmount(row.total_current_value)) continue;
    // Later rows win: fresh dashboard records replace older paginated records.
    byDate.set(row.date, { date: row.date, value: Number(row.total_current_value) });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function historyCovered(recent, since, today, complete) {
  if (!Array.isArray(recent)) return false;
  const rows = recordedPoints(recent, today);
  return complete === true || (complete == null && recent.length < 30)
    || Boolean(since && rows.length && rows[0].date <= since);
}

export function chartPoints(snapshots, since, today) {
  if (!validDay(today) || (since != null && !validDay(since))) return [];
  const records = recordedPoints(snapshots, today);
  if (!records.length) return [];
  const start = since && since > records[0].date ? since : records[0].date;
  const points = [];
  let index = 0;
  for (let time = Date.parse(start); time <= Date.parse(today); time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);
    while (index + 1 < records.length && records[index + 1].date <= date) index += 1;
    const source = records[index];
    points.push({ date, value: source.value, sourceDate: source.date, carried: source.date !== date });
  }
  return points;
}

export function valueChange(points) {
  const first = points?.[0];
  const last = points?.[points.length - 1];
  // A stale boundary is not a valuation for the requested period.
  if (points?.length < 2 || !first || first.carried || last.carried) return null;
  const amount = Math.round((last.value - first.value) * 100) / 100;
  return { amount, percentage: first.value > 0 ? amount / first.value * 100 : null };
}

export function chartGeometry(data, width, height, inset = 8) {
  if (!data.length || !Number.isFinite(width) || width <= 2 * inset || !Number.isFinite(height) || height <= 2 * inset) return [];
  const min = data.reduce((value, point) => Math.min(value, point.value), Infinity);
  const max = data.reduce((value, point) => Math.max(value, point.value), -Infinity);
  const start = Date.parse(data[0].date);
  const span = Date.parse(data[data.length - 1].date) - start;
  return data.map((point) => ({
    ...point,
    x: span ? inset + (Date.parse(point.date) - start) / span * (width - 2 * inset) : width / 2,
    y: max === min ? height / 2 : inset + (max - point.value) / (max - min) * (height - 2 * inset),
  }));
}

const quarterNumber = (date) => Number(date.slice(0, 4)) * 4 + Math.floor((Number(date.slice(5, 7)) - 1) / 3);
const QUARTER_NAMES = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];

export function dividendQuarters(dividends, today) {
  const current = quarterNumber(today);
  const totals = [0, 0, 0, 0];
  for (const dividend of dividends) {
    if (!dividend || !validDay(dividend.ex_date) || dividend.ex_date > today || !validAmount(dividend.total_dividend)) continue;
    const index = current - quarterNumber(dividend.ex_date);
    if (index >= 0 && index < 4) totals[index] += Math.round(Number(dividend.total_dividend) * 100);
  }
  return totals.map((paise, index) => {
    const quarter = current - index;
    return { label: QUARTER_NAMES[quarter % 4] + ' ' + Math.floor(quarter / 4), total: paise / 100 };
  });
}
