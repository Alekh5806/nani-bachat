// Run with: node scripts/check-history.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');

function load(file, dependencies = {}) {
  const filename = path.join(__dirname, '..', file);
  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports, console, require: (name) => dependencies[name] }, { filename });
  return exports;
}

const history = load('src/utils/portfolioHistory.js');
const snapshot = (date, value) => ({ date, total_current_value: value });
const today = '2026-11-25';
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }

check('club midnight and leap-year range boundaries', () => {
  assert.equal(history.todayInClub(new Date('2026-11-24T18:29:59Z')), '2026-11-24');
  assert.equal(history.todayInClub(new Date('2026-11-24T18:30:00Z')), today);
  assert.equal(history.firstDayOfRange('2024-03-01', 7), '2024-02-24');
  assert.equal(history.firstDayOfRange(today, null), null);
});

check('invalid dates, missing amounts, future rows and duplicate snapshots', () => {
  const points = history.recordedPoints([
    null, snapshot(today, '100'), snapshot('2026-11-24', 0), snapshot('2026-02-30', 7),
    snapshot('bad', 1), snapshot('2026-11-26', 1000), snapshot('2026-11-23', null),
    snapshot('2026-11-22', ' '), snapshot('2026-11-21', true), snapshot('2026-11-20', Infinity),
    snapshot(today, '101.55'), snapshot('2026-11-19', 'NaN'),
  ], today);
  assert.equal(points.length, 2);
  assert.equal(points[0].value, 0);
  assert.equal(points[1].value, 101.55);
});

check('missing calendar days retain provenance and never invent pre-history', () => {
  const points = history.chartPoints([snapshot('2026-11-23', '100'), snapshot(today, '125')], '2026-11-19', today);
  assert.equal(points.length, 3);
  assert.equal(points[1].date, '2026-11-24');
  assert.equal(points[1].value, 100);
  assert.equal(points[1].sourceDate, '2026-11-23');
  assert.equal(points[1].carried, true);
  assert.equal(points[2].carried, false);
});

check('old baseline keeps recent ranges visible without a false return', () => {
  const points = history.chartPoints([snapshot('2026-09-01', 100), snapshot(today, 110)], '2026-11-19', today);
  assert.equal(points.length, 7);
  assert.equal(points[0].sourceDate, '2026-09-01');
  assert.equal(history.valueChange(points), null);
});

check('flat, single, zero and negative values have finite visible coordinates', () => {
  for (const values of [[0], [100], [0, 0], [100, 100], [-100, -50], [-20, 0, 20]]) {
    const rows = values.map((value, i) => snapshot('2026-11-' + (23 + i), value));
    const points = history.chartPoints(rows, null, rows.at(-1).date);
    const geometry = history.chartGeometry(points, 320, 120);
    assert.equal(geometry.length, points.length);
    geometry.forEach(({ x, y }) => {
      assert.ok(Number.isFinite(x) && x >= 8 && x <= 312);
      assert.ok(Number.isFinite(y) && y >= 8 && y <= 112);
    });
  }
  assert.equal(history.chartGeometry([], 320, 120).length, 0);
  assert.equal(history.chartGeometry([{ date: today, value: 1 }], 0, 120).length, 0);
});

check('period changes respect paise, zero baselines, and stale endpoints', () => {
  assert.equal(history.valueChange(history.chartPoints([snapshot('2026-11-24', 0.1), snapshot(today, 0.3)], null, today)).amount, 0.2);
  const change = history.valueChange(history.chartPoints([snapshot('2026-11-24', 0), snapshot(today, 100)], null, today));
  assert.equal(change.amount, 100);
  assert.equal(change.percentage, null);
  assert.equal(history.valueChange(history.chartPoints([snapshot('2026-11-23', 100)], null, today)), null);
  assert.equal(history.valueChange([]), null);
  assert.equal(history.valueChange(null), null);
});

check('range coverage handles unsorted dashboard data and explicit completeness', () => {
  const recent = Array.from({ length: 30 }, (_, i) => snapshot('2026-10-' + String(i + 1).padStart(2, '0'), i));
  assert.equal(history.historyCovered(recent, '2026-11-19', today, false), true);
  assert.equal(history.historyCovered(recent, null, today, false), false);
  assert.equal(history.historyCovered(recent, null, today, true), true);
  assert.equal(history.historyCovered(null, null, today), false);
});

check('fresh dashboard values override stale long-range fetches', () => {
  const old = [snapshot('2026-01-01', 100), snapshot(today, 110)];
  const fresh = [snapshot(today, 125)];
  const points = history.chartPoints([...old, ...fresh], null, today);
  assert.equal(points.at(-1).value, 125);
  assert.equal(points.filter((p) => p.date === today).length, 1);
});

check('quarter bars ignore invalid and future dividends and retain exact paise', () => {
  const quarters = history.dividendQuarters([
    { ex_date: today, total_dividend: '0.10' }, { ex_date: today, total_dividend: '0.20' },
    { ex_date: '2026-11-26', total_dividend: 50 }, { ex_date: '2026-10-99', total_dividend: 50 },
    { ex_date: today, total_dividend: 'bad' }, { ex_date: '2025-12-10', total_dividend: 90 },
  ], today);
  assert.equal(quarters.length, 4);
  assert.equal(quarters[0].total, 0.3);
  assert.ok(quarters.every((q) => Number.isFinite(q.total)));
});

async function main() {
  let calls = 0;
  const { fetchPages } = load('src/config/fetchPages.js', { './api': { __esModule: true, default: {
    get: async (url, { params }) => {
      calls++;
      assert.equal(url, '/portfolio/growth/');
      assert.equal(params.limit, 'all');
      return { data: { results: [snapshot('2026-11-' + (26 - params.page), params.page)], next: params.page < 3 ? 'next' : null } };
    },
  } } });
  const rows = await fetchPages('/portfolio/growth/', { params: { limit: 'all' } });
  assert.equal(rows.length, 3);
  assert.equal(calls, 3);
  console.log(`PASS pagination across every page\n${checks + 1} history checks passed.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
