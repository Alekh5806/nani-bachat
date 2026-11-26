/**
 * Member Detail Screen
 * One member: profile card, totals, pending contribution and contribution history.
 */
import React, { useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import api from '../config/api';
import { useAuthStore } from '../store/authStore';
import { dateLabel } from '../utils/portfolioHistory';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { UserAvatar } from '../components/UserAvatar';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m) => {
  const [y, mm] = String(m).split('-');
  return MONTHS[parseInt(mm, 10) - 1] ? `${MONTHS[parseInt(mm, 10) - 1]} ${y}` : m;
};

const money = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

export const MemberDetailScreen = ({ route, navigation }) => {
  const memberParam = route.params?.member || {};
  const { user } = useAuthStore();
  const { members, fetchMembers } = usePortfolioStore();
  const memberId = memberParam.id;
  const member = members.find((m) => m.id === memberId) || memberParam;
  const canViewHistory = memberId != null && (
    user?.id === memberId || user?.is_staff || user?.is_admin || user?.role === 'admin'
  );
  const [history, setHistory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const loadHistory = useCallback(async () => {
    if (!canViewHistory) return;
    const request = ++requestId.current;
    setHistory(null);
    try {
      const { data } = await api.get('/contributions/', { params: { member_id: memberId } });
      if (request === requestId.current) setHistory({ memberId, rows: Array.isArray(data) ? data : data.results || [] });
    } catch {
      if (request === requestId.current) setHistory({ memberId, error: true });
    }
  }, [canViewHistory, memberId]);

  useFocusEffect(useCallback(() => {
    fetchMembers();
    loadHistory();
    return () => { requestId.current += 1; };
  }, [fetchMembers, loadHistory]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchMembers(), loadHistory()]);
    } finally {
      setRefreshing(false);
    }
  };

  const currentHistory = history?.memberId === memberId ? history : null;
  const rows = currentHistory?.rows || [];
  const sorted = [...rows].sort((x, y) => String(y.month).localeCompare(String(x.month)));
  const years = [...new Set(sorted.map((c) => String(c.month).slice(0, 4)))];

  const pending = rows.filter((c) => c.status !== 'paid');
  const pendingTotal = pending.reduce((sum, c) => sum + (Number(c.payable_amount ?? c.amount) || 0), 0);

  const Row = ({ label, value, color }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={member.name || 'Member'}
        subtitle={member.role === 'admin' ? 'Admin' : 'Member'}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        <View style={styles.profile}>
          <UserAvatar person={member} size={56} />
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{member.name}</Text>
            <Text style={styles.profileSub}>{member.phone || '—'}</Text>
            {!!member.email && <Text style={styles.profileSub}>{member.email}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Row label="Monthly Amount" value={money(member.monthly_amount)} />
          <Row label="Total Contributed" value={money(member.total_contribution)} />
          <Row label="Ownership" value={`${member.ownership_percentage || 0}%`} />
          {canViewHistory && (
            <Row
              label="Pending contribution"
              value={!currentHistory?.rows ? '—' : pending.length ? `${money(pendingTotal)} (${pending.length})` : 'None'}
              color={currentHistory?.rows ? pending.length ? COLORS.loss : COLORS.profit : undefined}
            />
          )}
        </View>

        <SectionHeader title="Contribution history" />
        {!canViewHistory ? (
          <Text style={styles.empty}>Payment history is visible to the member and admins.</Text>
        ) : !currentHistory ? (
          <ActivityIndicator accessibilityLabel="Loading contribution history" style={styles.historyState} color={COLORS.accent} />
        ) : currentHistory.error ? (
          <Pressable accessibilityRole="button" onPress={loadHistory} style={styles.historyState}>
            <Text style={styles.retry}>Couldn’t load contribution history. Retry</Text>
          </Pressable>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No contributions yet</Text>
        ) : null}
        {canViewHistory && years.map((year) => {
          const rows = sorted.filter((c) => String(c.month).slice(0, 4) === year);
          return (
            <View key={year}>
              <View style={styles.band}>
                <Text style={styles.bandText}>{year}</Text>
                <Text style={styles.bandTotal}>{rows.filter((c) => c.status === 'paid').length}/{rows.length} paid</Text>
              </View>
              {rows.map((c, i) => {
                const paid = c.status === 'paid';
                return (
                  <View key={c.id} style={[styles.hRow, i > 0 && styles.hRowDivider]}>
                    <View style={styles.hLeft}>
                      <Text style={styles.hName}>{monthLabel(c.month)}</Text>
                      {paid && c.paid_date && <Text style={styles.hSub}>Paid on {dateLabel(c.paid_date)}</Text>}
                    </View>
                    <View style={styles.hRight}>
                      <Text style={styles.hAmount}>{money(c.amount)}</Text>
                      <Text style={[styles.hSub, { color: paid ? COLORS.profit : COLORS.loss }]}>{paid ? 'Paid' : 'Unpaid'}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { width: '100%', maxWidth: 840, alignSelf: 'center', paddingHorizontal: SPACING.lg },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.lg,
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { ...TYPE.rowTitle, color: COLORS.textPrimary },
  profileSub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.xs },
  card: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: SPACING.sm, rowGap: SPACING.xs, paddingVertical: 6 },
  rowLabel: { ...TYPE.secondary, flexGrow: 1, flexShrink: 1, flexBasis: 104, color: COLORS.textSecondary },
  rowValue: { ...TYPE.smallValue, textAlign: 'right', marginLeft: 'auto', maxWidth: '100%', color: COLORS.textPrimary },
  historyState: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' },
  retry: { ...TYPE.button, color: COLORS.accent },
  empty: { ...TYPE.secondary, color: COLORS.textMuted, marginBottom: SPACING.md },
  band: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACING.sm, marginTop: SPACING.md,
    marginHorizontal: -SPACING.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.isDark ? COLORS.surface : COLORS.surfaceLight,
  },
  bandText: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  bandTotal: { ...TYPE.caption, color: COLORS.textMuted, marginLeft: 'auto' },
  hRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  hRowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  hLeft: { flexGrow: 1, flexShrink: 1, flexBasis: 112 },
  hRight: { alignItems: 'flex-end', marginLeft: 'auto', maxWidth: '100%' },
  hName: { ...TYPE.rowTitle, color: COLORS.textPrimary },
  hAmount: { ...TYPE.listAmount, color: COLORS.textPrimary, textAlign: 'right' },
  hSub: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4 },
}));
