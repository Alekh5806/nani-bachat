/**
 * Member Detail Screen
 * One member: info, totals, pending contribution and contribution history.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import api from '../config/api';
import { usePortfolioStore } from '../store/portfolioStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

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
        <GlassCard style={styles.card}>
          <Row label="Phone" value={member.phone || '—'} />
          {!!member.email && <Row label="Email" value={member.email} />}
          <Row label="Monthly Amount" value={money(member.monthly_amount)} />
          <Row label="Total Contributed" value={money(member.total_contribution)} />
          <Row label="Ownership" value={`${member.ownership_percentage || 0}%`} />
          <Row
            label="Pending Contribution"
            value={pending.length ? `${money(pendingTotal)} (${pending.length})` : 'None'}
            color={pending.length ? COLORS.loss : COLORS.profit}
          />
        </GlassCard>

        <Pressable
          onPress={() =>
            navigation.navigate('Contributions', { memberId: member.id, memberName: member.name })
          }
          style={styles.action}
        >
          <Text style={styles.actionText}>Manage Contributions</Text>
        </Pressable>

        <SectionHeader title="Contribution History" />
        {history.length === 0 && <Text style={styles.empty}>No contributions yet</Text>}
        {history.map((c) => (
          <GlassCard key={c.id} style={styles.card}>
            <Row label={c.month} value={money(c.amount)} />
            <Row
              label="Status"
              value={c.status === 'paid' ? `Paid${c.paid_date ? ` on ${c.paid_date}` : ''}` : 'Pending'}
              color={c.status === 'paid' ? COLORS.profit : COLORS.loss}
            />
          </GlassCard>
        ))}
        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.huge },
  card: { marginBottom: SPACING.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...TYPE.secondary, color: COLORS.textSecondary },
  rowValue: { ...TYPE.smallValue, color: COLORS.textPrimary },
  empty: { ...TYPE.secondary, color: COLORS.textMuted },
  action: {
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: 8, paddingVertical: SPACING.md, marginBottom: SPACING.md,
  },
  actionText: { ...TYPE.button, color: COLORS.accent },
}));
