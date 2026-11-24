/**
 * Member Detail Screen
 * One member: profile card, totals, pending contribution and contribution history.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import api from '../config/api';
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
  const { members, fetchMembers } = usePortfolioStore();
  const member = members.find((m) => m.id === memberParam.id) || memberParam;
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
      api.get(`/contributions/?member_id=${memberParam.id}`)
        .then((res) => setHistory(Array.isArray(res.data) ? res.data : res.data.results || []))
        .catch(() => {});
    }, [memberParam.id, fetchMembers])
  );

  // Newest first, grouped by year.
  const sorted = [...history].sort((x, y) => String(y.month).localeCompare(String(x.month)));
  const years = [...new Set(sorted.map((c) => String(c.month).slice(0, 4)))];

  const pending = history.filter((c) => c.status !== 'paid');
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <UserAvatar person={member} size={56} />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>{member.name}</Text>
            <Text style={styles.profileSub} numberOfLines={1}>{member.phone || '—'}</Text>
            {!!member.email && <Text style={styles.profileSub} numberOfLines={1}>{member.email}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Row label="Monthly Amount" value={money(member.monthly_amount)} />
          <Row label="Total Contributed" value={money(member.total_contribution)} />
          <Row label="Ownership" value={`${member.ownership_percentage || 0}%`} />
          <Row
            label="Pending Contribution"
            value={pending.length ? `${money(pendingTotal)} (${pending.length})` : 'None'}
            color={pending.length ? COLORS.loss : COLORS.profit}
          />
        </View>

        <SectionHeader title="Contribution History" />
        {history.length === 0 && <Text style={styles.empty}>No contributions yet</Text>}
        {years.map((year) => {
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
                      <Text style={styles.hSub}>
                        {paid && c.paid_date ? 'Paid on ' + new Date(c.paid_date).toLocaleDateString('en-IN') : paid ? 'Paid' : 'Not paid yet'}
                      </Text>
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
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 0 },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.lg,
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { ...TYPE.cardTitle, fontSize: 16, color: COLORS.textPrimary },
  profileSub: { ...TYPE.caption, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  card: {
    backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { ...TYPE.cardTitle, fontSize: 12, flex: 1, color: COLORS.textPrimary },
  rowValue: { ...TYPE.secondary, fontSize: 12, flex: 1, color: COLORS.textSecondary },
  empty: { ...TYPE.secondary, color: COLORS.textMuted, marginBottom: SPACING.md },
  band: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md,
    marginHorizontal: -SPACING.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.isDark ? COLORS.surface : COLORS.surfaceLight,
  },
  bandText: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  bandTotal: { ...TYPE.caption, color: COLORS.textMuted },
  hRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  hRowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  hLeft: { flex: 1, minWidth: 0, marginRight: SPACING.md },
  hRight: { alignItems: 'flex-end' },
  hName: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  hAmount: { ...TYPE.smallValue, fontSize: 12, color: COLORS.textPrimary },
  hSub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
}));
