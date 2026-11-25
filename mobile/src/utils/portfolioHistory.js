// Daily snapshots and dividend ex-dates are calendar dates in the club's time zone.
const DAY_MS = 86400000;
const clubDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});

export const todayInClub = () => {
  const parts = clubDay.formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type).value;
  return [part('year'), part('month'), part('day')].join('-');
};

export const firstDayOfRange = (today, days) => days
  ? new Date(Date.parse(today) - (days - 1) * DAY_MS).toISOString().slice(0, 10)
  : null;

export const dateLabel = (date) => new Date(date).toLocaleDateString('en-IN', {
  timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric',
});

export function chartPoints(snapshots, since, today) {
  return snapshots
    .filter(({ date, total_current_value: value }) => date <= today && (!since || date >= since)
      && value != null && value !== '' && Number.isFinite(Number(value)))
    .map(({ date, total_current_value }) => ({ date, value: Number(total_current_value) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const quarterNumber = (date) => Number(date.slice(0, 4)) * 4 + Math.floor((Number(date.slice(5, 7)) - 1) / 3);
const QUARTER_NAMES = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];

export function dividendQuarters(dividends, today) {
  const current = quarterNumber(today);
  const totals = [0, 0, 0, 0];
  for (const dividend of dividends) {
    if (!dividend.ex_date) continue;
    const index = current - quarterNumber(dividend.ex_date);
    if (index >= 0 && index < 4) totals[index] += Math.round(Number(dividend.total_dividend) * 100);
  }
  return totals.map((paise, index) => {
    const quarter = current - index;
    return { label: QUARTER_NAMES[quarter % 4] + ' ' + Math.floor(quarter / 4), total: paise / 100 };
  });
}
