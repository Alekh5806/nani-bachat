/**
 * Dashboard Screen — Groww-style Portfolio View
 * Clean, minimal, portfolio-first. No emojis in section titles.
 * Dark flat cards, bright green/red for P&L, simple list holdings.
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Dimensions, Pressable, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { COLORS, SPACING, FONTS, RADIUS, SHADOWS } from '../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

// Currency helpers
const fmtFull = (v) => {
  const n = Number(v) || 0;
  return '\u20B9' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtShort = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 10000000) return '\u20B9' + (n / 10000000).toFixed(2) + ' Cr';
  if (Math.abs(n) >= 100000) return '\u20B9' + (n / 100000).toFixed(2) + ' L';
  if (Math.abs(n) >= 1000) return '\u20B9' + (n / 1000).toFixed(1) + 'K';
  return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

// Component
export const DashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const {
    dashboard, fetchDashboard,
    stockSummary, fetchStockSummary,
    isLoading,
  } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchStockSummary();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboard(), fetchStockSummary()]);
    setRefreshing(false);
  }, []);

  const p = dashboard?.portfolio || {};
  const my = dashboard?.my_portfolio || {};
  const holdings = stockSummary?.stocks || [];
  const allocation = dashboard?.allocation || [];

  const pnl = Number(p.profit_loss) || 0;
  const pnlPct = Number(p.growth_percentage) || 0;
  const isUp = pnl >= 0;

  const totalVal = holdings.reduce((s, h) => s + (Number(h.current_value) || 0), 0) || 1;

  // Calculate today's return from all holdings
  const todayReturn = holdings.reduce((s, h) => s + (Number(h.day_change_value) || 0), 0);
  const totalDayChange = Number(stockSummary?.total_day_change) || todayReturn;
  const todayPct = totalVal > 0 ? (totalDayChange / (totalVal - totalDayChange)) * 100 : 0;
  const todayUp = totalDayChange >= 0;

  if (isLoading && !dashboard) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DashboardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={COLORS.accent} colors={[COLORS.accent]} />
        }
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {(user?.name || 'User').split(' ')[0]}
            </Text>
            <Text style={styles.greetingSub}>Nani Bachat Portfolio</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
        </View>

        {/* PORTFOLIO VALUE CARD */}
        <View style={styles.valueCard}>
          <Text style={styles.valueLabel}>Current Value</Text>
          <Text style={styles.valueAmount} numberOfLines={1} adjustsFontSizeToFit>
            {fmtFull(p.current_value)}
          </Text>

          <View style={styles.pnlRow}>
            <Text style={[styles.pnlAmount, { color: isUp ? COLORS.profit : COLORS.loss }]}>
              {isUp ? '+' : ''}{fmtFull(pnl)}
            </Text>
            <View style={[styles.pnlPill, { backgroundColor: isUp ? COLORS.profitBg : COLORS.lossBg }]}>
              <Text style={[styles.pnlPillText, { color: isUp ? COLORS.profit : COLORS.loss }]}>
                {isUp ? '\u2191' : '\u2193'} {Math.abs(pnlPct).toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Today's Return */}
          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>Today's Return</Text>
            <View style={styles.todayRight}>
              <Text style={[styles.todayValue, { color: todayUp ? COLORS.profit : COLORS.loss }]}>
                {todayUp ? '+' : ''}{fmtFull(totalDayChange)}
              </Text>
              <Text style={[styles.todayPct, { color: todayUp ? COLORS.profit : COLORS.loss }]}>
                {' '}({todayUp ? '+' : ''}{Math.abs(todayPct).toFixed(2)}%)
              </Text>
            </View>
          </View>

          <View style={styles.stripRow}>
            <StripItem label="Invested" value={fmtShort(p.total_invested)} />
            <View style={styles.stripDivider} />
            <StripItem label="Returns" value={fmtShort(p.total_returns)} color={isUp ? COLORS.profit : COLORS.loss} />
            <View style={styles.stripDivider} />
            <StripItem label="Dividends" value={fmtShort(p.total_dividends)} />
          </View>
        </View>

        {/* YOUR SHARE */}
        <View style={styles.shareCard}>
          <View style={styles.shareRow}>
            <View style={styles.shareLeft}>
              <Text style={styles.shareLabel}>Your Share</Text>
              <Text style={styles.shareSub}>
                {Number(my.ownership_percentage || 0).toFixed(1)}% ownership
              </Text>
            </View>
            <View style={styles.shareRight}>
              <Text style={styles.shareValue}>{fmtFull(my.current_value)}</Text>
              <Text style={[styles.sharePnl, { color: isUp ? COLORS.profit : COLORS.loss }]}>
                {isUp ? '+' : ''}{fmtFull(my.profit_loss)}
              </Text>
            </View>
          </View>

          <View style={styles.shareMiniRow}>
            <View style={styles.shareMiniItem}>
              <Text style={styles.shareMiniLabel}>Contributed</Text>
              <Text style={styles.shareMiniValue}>{fmtShort(my.total_contribution)}</Text>
            </View>
            <View style={styles.shareMiniItem}>
              <Text style={styles.shareMiniLabel}>Dividends</Text>
              <Text style={styles.shareMiniValue}>{fmtShort(my.dividend_earned)}</Text>
            </View>
            <View style={styles.shareMiniItem}>
              <Text style={styles.shareMiniLabel}>Members</Text>
              <Text style={styles.shareMiniValue}>{dashboard?.active_members || 0}</Text>
            </View>
          </View>
        </View>

        {/* HOLDINGS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Stocks</Text>
          <Text style={styles.sectionCount}>{holdings.length}</Text>
        </View>

        <View style={styles.holdingsCard}>
          {holdings.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No investments yet</Text>
              <Text style={styles.emptySub}>Add your first stock from the Investments tab</Text>
            </View>
          )}

          {holdings.map((stock, idx) => {
            const sPnl = Number(stock.profit_loss) || 0;
            const sPct = Number(stock.profit_loss_percentage) || 0;
            const sUp = sPnl >= 0;
            const sColor = sUp ? COLORS.profit : COLORS.loss;
            const allocPct = ((Number(stock.current_value) || 0) / totalVal * 100);

            return (
              <View key={stock.symbol || idx}>
                {idx > 0 && <View style={styles.holdingDivider} />}
                <View style={styles.holdingRow}>
                  <View style={styles.holdingLeft}>
                    <View style={styles.holdingIcon}>
                      <Text style={styles.holdingIconText}>
                        {(stock.symbol || '').replace('.NS', '').substring(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.holdingInfo}>
                      <Text style={styles.holdingName} numberOfLines={1}>
                        {(stock.symbol || '').replace('.NS', '')}
                      </Text>
                      <Text style={styles.holdingQty}>
                        {stock.total_quantity || stock.quantity} shares
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holdingRight}>
                    <Text style={styles.holdingValue}>{fmtFull(stock.current_value)}</Text>
                    <Text style={[styles.holdingPnl, { color: sColor }]}>
                      {sUp ? '+' : ''}{fmtFull(sPnl)} ({sUp ? '+' : ''}{sPct.toFixed(2)}%)
                    </Text>
                  </View>
                </View>

                <View style={styles.holdingDetails}>
                  <Text style={styles.detailItem}>
                    Avg. {'\u20B9'}{Number(stock.average_buy_price || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.detailDot}>{'\u00B7'}</Text>
                  <Text style={styles.detailItem}>
                    LTP {'\u20B9'}{Number(stock.current_price || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.detailDot}>{'\u00B7'}</Text>
                  <Text style={styles.detailItem}>
                    {allocPct.toFixed(1)}% of portfolio
                  </Text>
                </View>

                <View style={styles.allocBarTrack}>
                  <View style={[
                    styles.allocBarFill,
                    {
                      width: Math.max(allocPct, 3) + '%',
                      backgroundColor: sUp ? COLORS.profit : COLORS.loss,
                    }
                  ]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* OVERVIEW */}
        {holdings.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overview</Text>
            </View>

            <View style={styles.overviewCard}>
              <OverviewRow label="Total Invested" value={fmtFull(p.total_invested)} />
              <OverviewRow label="Current Value" value={fmtFull(p.current_value)} />
              <OverviewRow
                label="P&L"
                value={(isUp ? '+' : '') + fmtFull(pnl)}
                valueColor={isUp ? COLORS.profit : COLORS.loss}
              />
              <OverviewRow label="Total Dividends" value={fmtFull(p.total_dividends)} />
              <OverviewRow
                label="Total Returns"
                value={(Number(p.total_returns) >= 0 ? '+' : '') + fmtFull(p.total_returns)}
                valueColor={Number(p.total_returns) >= 0 ? COLORS.profit : COLORS.loss}
                isLast
              />
            </View>

            {/* ALLOCATION */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Allocation</Text>
            </View>

            <View style={styles.overviewCard}>
              {allocation.map((item, i) => {
                const pct = Number(item.percentage) || 0;
                const barColors = ['#00D09C', '#5AC53A', '#42A5F5', '#FFB74D', '#E91E63', '#7C3AED', '#26C6DA', '#FF7043'];
                const barColor = barColors[i % barColors.length];

                return (
                  <View key={item.symbol || i}>
                    {i > 0 && <View style={styles.overviewDivider} />}
                    <View style={styles.allocRow}>
                      <View style={[styles.allocDot, { backgroundColor: barColor }]} />
                      <Text style={styles.allocName} numberOfLines={1}>
                        {(item.symbol || '').replace('.NS', '')}
                      </Text>
                      <Text style={styles.allocPctText}>{pct.toFixed(1)}%</Text>
                      <Text style={styles.allocValue}>{fmtShort(item.value)}</Text>
                    </View>
                    <View style={styles.allocMiniBar}>
                      <View style={[styles.allocMiniFill, { width: pct + '%', backgroundColor: barColor }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Sub-components
const StripItem = ({ label, value, color }) => (
  <View style={styles.stripItem}>
    <Text style={styles.stripLabel}>{label}</Text>
    <Text style={[styles.stripValue, color && { color }]}>{value}</Text>
  </View>
);

const OverviewRow = ({ label, value, valueColor, isLast }) => (
  <>
    <View style={styles.overviewRow}>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={[styles.overviewValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
    {!isLast && <View style={styles.overviewDivider} />}
  </>
);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.sm,
  },
  greeting: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  greetingSub: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: FONTS.lg,
    fontWeight: '800',
  },

  // Value card
  valueCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  valueLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  valueAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  pnlAmount: {
    fontSize: FONTS.md,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  pnlPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  pnlPillText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  todayLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  todayRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayValue: {
    fontSize: FONTS.sm,
    fontWeight: '700',
  },
  todayPct: {
    fontSize: FONTS.xs,
    fontWeight: '600',
  },
  stripRow: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
  },
  stripDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  stripLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  stripValue: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Share card
  shareCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
    ...SHADOWS.card,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shareLeft: {},
  shareLabel: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  shareSub: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  shareRight: {
    alignItems: 'flex-end',
  },
  shareValue: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sharePnl: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  shareMiniRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  shareMiniItem: {
    flex: 1,
  },
  shareMiniLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  shareMiniValue: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },

  // Holdings card
  holdingsCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOWS.card,
  },
  holdingDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holdingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  holdingIconText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  holdingQty: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  holdingRight: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  holdingValue: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  holdingPnl: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    marginTop: 2,
  },

  // Holding details row
  holdingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingLeft: 38 + SPACING.md,
  },
  detailItem: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },
  detailDot: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.xs,
  },

  // Allocation bar inside holdings
  allocBarTrack: {
    height: 3,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    marginTop: SPACING.sm,
    marginLeft: 38 + SPACING.md,
    overflow: 'hidden',
  },
  allocBarFill: {
    height: 3,
    borderRadius: 2,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Overview card
  overviewCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOWS.card,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  overviewLabel: {
    fontSize: FONTS.sm,
    color: COLORS.textMuted,
  },
  overviewValue: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  // Allocation section
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  allocDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  allocName: {
    flex: 1,
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  allocPctText: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    minWidth: 45,
    textAlign: 'right',
    marginRight: SPACING.lg,
  },
  allocValue: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    minWidth: 55,
    textAlign: 'right',
  },
  allocMiniBar: {
    height: 3,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  allocMiniFill: {
    height: 3,
    borderRadius: 2,
  },
});
