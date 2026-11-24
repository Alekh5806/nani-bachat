/**
 * Members Screen
 * Shows all pool members with their contribution and portfolio details
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Pressable
} from 'react-native';
import { Add } from 'iconsax-react-native';
import { useFocusEffect } from '@react-navigation/native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { MemberRow } from '../components/MemberRow';
import { fmtFull } from '../utils/currency';
import { SummaryCard } from '../components/SummaryCard';
import { SectionHeader } from '../components/SectionHeader';
import { ContributionsScreen } from './ContributionsScreen';
import { COLORS, SPACING, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';

const TABS = [['members', 'Member'], ['contributions', 'Contribution'], ['history', 'History']];

export const MembersScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { members, fetchMembers, dashboard, fetchDashboard } = usePortfolioStore();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('members');
  // History tab registers a "load more" function here; we call it near the bottom.
  const endRef = useRef(null);
  // Contribution tab registers its "Generate month" opener here for the header Add button.
  const addRef = useRef(null);
  const viewH = useRef(0);
  const nearEnd = (y, viewport, content) => {
    if (y + viewport >= content - 240) endRef.current?.();
  };

  useEffect(() => {
    fetchMembers();
    fetchDashboard();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
      fetchDashboard();
    }, [fetchMembers, fetchDashboard])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMembers(), fetchDashboard()]);
    setRefreshing(false);
  }, []);

  const isAdmin = user?.role === 'admin';
  const my = dashboard?.my_portfolio || {};
  const pnl = Number(my.profit_loss) || 0;
  const totalContributions = members.reduce(
    (sum, m) => sum + (Number(m.total_contribution) || 0), 0
  );
  const activeCount = members.filter((m) => m.is_active !== false).length;
  const averageContribution = members.length ? Math.round(totalContributions / members.length) : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Members"
        subtitle={`${members.length} active members`}
        rightAction={isAdmin && tab !== 'history'
          ? () => (tab === 'members' ? navigation.navigate('AddMember') : addRef.current?.())
          : undefined}
        rightIcon={<Add size={16} color={COLORS.onAccent} />}
        rightLabel="Add"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={200}
        onLayout={(e) => { viewH.current = e.nativeEvent.layout.height; }}
        onScroll={({ nativeEvent: n }) => nearEnd(n.contentOffset.y, n.layoutMeasurement.height, n.contentSize.height)}
        onContentSizeChange={(w, h) => nearEnd(0, viewH.current, h)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* ── Tabs: only the active one is rendered ── */}
        <View style={styles.tabs}>
          {TABS.map(([key, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'members' ? (
          <>
          {/* ── Ownership and group totals: one summary card ── */}
          <SummaryCard
            label={`Your ownership · ${Number(my.ownership_percentage || 0).toFixed(1)}% of the group`}
            value={fmtFull(my.current_value)}
            style={{ marginBottom: 0 }}
            rows={[
              { label: 'Profit / loss', value: `${pnl >= 0 ? '+' : ''}${fmtFull(pnl)}`, color: pnl === 0 ? COLORS.neutral : pnl > 0 ? COLORS.profit : COLORS.loss },
              { label: 'Contributed', value: fmtFull(my.total_contribution) },
              { label: 'Dividends', value: fmtFull(my.dividend_earned) },
              { label: `Group contributed (${activeCount} members)`, value: `₹${totalContributions.toLocaleString('en-IN')}` },
              { label: 'Average per member', value: `₹${averageContribution.toLocaleString('en-IN')}` },
            ]}
          />

          {/* ── Member List ── */}
          <SectionHeader title="All Members" />
          {members.map((member, index) => (
            <MemberRow key={member.id || index} member={member} onPress={() => navigation.navigate('MemberDetail', { member })} />
          ))}
          </>
        ) : (
          <ContributionsScreen route={{}} navigation={navigation} embedded view={tab} endRef={endRef} addRef={addRef} />
        )}

        <TabBarSpacer />
      </ScrollView>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 0,
  },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.divider, marginBottom: SPACING.md },
  tab: { paddingVertical: SPACING.md, marginRight: SPACING.xl, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.textPrimary },
  tabText: { ...TYPE.body, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.textPrimary },
}));
