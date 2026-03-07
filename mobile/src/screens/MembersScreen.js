/**
 * Members Screen
 * Shows all pool members with their contribution and portfolio details
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl
} from 'react-native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { MemberRow } from '../components/MemberRow';
import { StatCard } from '../components/StatCard';
import { SectionHeader } from '../components/SectionHeader';
import { COLORS, SPACING, FONTS } from '../theme/colors';

export const MembersScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { members, fetchMembers } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  }, []);

  const isAdmin = user?.role === 'admin';
  const totalContributions = members.reduce(
    (sum, m) => sum + (Number(m.total_contribution) || 0), 0
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Members"
        subtitle={`${members.length} active members`}
        rightAction={() => navigation.navigate('Contributions')}
        rightIcon="💰"
        rightLabel="Payments"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Summary ── */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total Members"
            value={String(members.length)}
            icon="👥"
            compact
            style={styles.halfCard}
          />
          <StatCard
            label="Total Contributed"
            value={`₹${totalContributions.toLocaleString('en-IN')}`}
            icon="💰"
            compact
            style={styles.halfCard}
          />
        </View>

        {/* ── Member List ── */}
        <SectionHeader title="All Members" icon="👥" />
        {members.map((member, index) => (
          <MemberRow key={member.id || index} member={member} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.huge,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
});
