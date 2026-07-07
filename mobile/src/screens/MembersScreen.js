/**
 * Members Screen
 * Shows all pool members with their contribution and portfolio details
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

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

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

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

        {isAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity
              style={[styles.adminButton, styles.addButton]}
              onPress={() => navigation.navigate('AddMember')}
            >
              <Ionicons name="person-add-outline" size={18} color="#FFF" />
              <Text style={styles.adminButtonText}>Add Member</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminButton, styles.paymentsButton]}
              onPress={() => navigation.navigate('Contributions')}
            >
              <Ionicons name="cash-outline" size={18} color={COLORS.accent} />
              <Text style={[styles.adminButtonText, styles.paymentsButtonText]}>Payments</Text>
            </TouchableOpacity>
          </View>
        )}

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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  halfCard: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 4,
  },
  adminActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  adminButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  addButton: {
    backgroundColor: COLORS.accent,
  },
  paymentsButton: {
    backgroundColor: COLORS.accent + '18',
    borderWidth: 1,
    borderColor: COLORS.accent + '50',
  },
  adminButtonText: {
    color: '#FFF',
    fontSize: FONTS.sm,
    fontWeight: '800',
  },
  paymentsButtonText: {
    color: COLORS.accent,
  },
});
