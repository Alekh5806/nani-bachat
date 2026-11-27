import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions,
} from 'react-native';
import { Add, ArrowDown2, Refresh2 } from 'iconsax-react-native';
import { useFocusEffect } from '@react-navigation/native';

import { usePortfolioStore } from '../store/portfolioStore';
import { useAuthStore } from '../store/authStore';
import { ScreenHeader } from '../components/ScreenHeader';
import { AmountText } from '../components/AmountText';
import { GlassCard } from '../components/GlassCard';
import { MemberRow } from '../components/MemberRow';
import { fmtFull } from '../utils/currency';
import { usePersistedState } from '../utils/usePersistedState';
import { ContributionsScreen } from './ContributionsScreen';
import { COLORS, RADIUS, SPACING, themedStyles, TYPE } from '../theme/colors';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { TabSwipeArea } from '../components/TabSwipeArea';

const TABS = [['members', 'Directory'], ['contributions', 'Contributions'], ['history', 'History']];
const TAB_KEYS = TABS.map(([key]) => key);
const TAB_MIN_WIDTHS = { members: 68, contributions: 102, history: 54 };
const CONTENT_WIDTH = 1040;

export const MembersScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const { members, fetchMembers, dashboard, fetchDashboard } = usePortfolioStore();
  const { width, fontScale } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [directoryStatus, setDirectoryStatus] = useState('loading');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [tab, setTab] = usePersistedState('tab:members', 'members', TAB_KEYS);
  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const addRef = useRef(null);
  const refreshRef = useRef(null);
  const viewHeight = useRef(0);

  const loadDirectory = useCallback(async () => {
    const [result] = await Promise.all([fetchMembers(), fetchDashboard()]);
    setDirectoryStatus(result == null ? 'error' : 'ready');
  }, [fetchMembers, fetchDashboard]);

  useFocusEffect(useCallback(() => {
    loadDirectory();
  }, [loadDirectory]));

  const selectTab = useCallback((key) => {
    if (key === tab) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setTab(key);
  }, [tab, setTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (tab === 'members') await loadDirectory();
      else await refreshRef.current?.();
    } finally {
      setRefreshing(false);
    }
  };

  const nearEnd = (y, viewport, content) => {
    if (tab === 'history' && y + viewport >= content - 240) endRef.current?.();
  };

  const isAdmin = user?.is_staff || user?.is_admin || user?.role === 'admin';
  const my = dashboard?.my_portfolio;
  const pnl = Number(my?.profit_loss) || 0;
  const activeMembers = members.filter((member) => member.is_active !== false);
  const groupTotal = activeMembers.reduce((sum, member) => sum + (Number(member.total_contribution) || 0), 0);
  const average = activeMembers.length ? groupTotal / activeMembers.length : 0;
  const isWeb = Platform.OS === 'web';
  const textScale = Math.max(1, fontScale);
  const wide = width >= 840 * textScale;
  const canAct = isAdmin && tab !== 'history';
  const tabWidth = Math.min(width, CONTENT_WIDTH) - SPACING.lg * 2 - (isWeb ? 48 : 0);
  const wrapTabs = tabWidth < 240 * textScale;
  const compactTabs = tabWidth < 345 * textScale;
  const headerAction = () => (tab === 'members' ? navigation.navigate('AddMember') : addRef.current?.());
  const headerLabel = tab === 'members' ? 'Add member' : 'Generate month';

  return (
    <TabSwipeArea tab={tab} tabKeys={TAB_KEYS} onChange={selectTab} style={styles.container}>
      <View style={styles.frame}>
        <ScreenHeader
          title="Members"
          subtitle={members.length > 0 || directoryStatus === 'ready'
            ? `${activeMembers.length} active ${activeMembers.length === 1 ? 'member' : 'members'}`
            : undefined}
          inset={SPACING.lg}
          rightAction={canAct ? headerAction : undefined}
          rightIcon={<Add size={16} color={COLORS.onAccent} />}
          rightLabel={headerLabel}
        />
        <View style={styles.tabBar}>
          <View accessibilityRole="tablist" style={[styles.tabs, wrapTabs && styles.wrappedTabs]}>
            {TABS.map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                aria-selected={tab === key}
                onPress={() => selectTab(key)}
                style={[
                  styles.tab,
                  compactTabs && key === 'contributions' && styles.longTab,
                  wrapTabs && { flexBasis: Math.min(tabWidth, TAB_MIN_WIDTHS[key] * textScale) },
                  tab === key && styles.tabActive,
                ]}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {isWeb && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh current tab"
              aria-busy={refreshing}
              disabled={refreshing}
              onPress={onRefresh}
              style={({ hovered }) => [styles.refreshButton, hovered && styles.refreshHovered]}
            >
              {refreshing
                ? <ActivityIndicator size="small" color={COLORS.accent} />
                : <Refresh2 size={17} color={COLORS.textSecondary} />}
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={200}
          onLayout={(e) => { viewHeight.current = e.nativeEvent.layout.height; }}
          onScroll={({ nativeEvent: n }) => nearEnd(n.contentOffset.y, n.layoutMeasurement.height, n.contentSize.height)}
          onContentSizeChange={(_, height) => nearEnd(0, viewHeight.current, height)}
          refreshControl={isWeb ? undefined : <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        >
          {tab === 'members' ? (
            <View style={[styles.directory, wide && styles.directoryWide]}>
              <GlassCard style={wide && styles.summaryWide} padding={SPACING.md}>
                <Text style={styles.label}>Your portfolio value</Text>
                <AmountText style={styles.value}>{my ? fmtFull(my.current_value) : '—'}</AmountText>
                {my && (
                  <View style={styles.metrics}>
                    <Text style={styles.label}>{Number(my.ownership_percentage || 0).toFixed(1)}% ownership</Text>
                    <Text style={[styles.metricValue, { color: pnl === 0 ? COLORS.neutral : pnl > 0 ? COLORS.profit : COLORS.loss }]}>
                      {pnl > 0 ? '+' : ''}{fmtFull(pnl)} P/L
                    </Text>
                  </View>
                )}
                <Pressable
                  accessibilityRole="button"
                  aria-expanded={showBreakdown}
                  onPress={() => setShowBreakdown((open) => !open)}
                  style={styles.disclosure}
                >
                  <Text style={styles.link}>{showBreakdown ? 'Hide breakdown' : 'View breakdown'}</Text>
                  <ArrowDown2 size={14} color={COLORS.accent} style={showBreakdown && styles.expandedIcon} />
                </Pressable>
                {showBreakdown && (
                  <View style={styles.breakdown}>
                    {[
                      ['Your contributions', my ? fmtFull(my.total_contribution) : '—'],
                      ['Dividends', my ? fmtFull(my.dividend_earned) : '—'],
                      ['Group contributions', directoryStatus === 'ready' || members.length ? fmtFull(groupTotal) : '—'],
                      ['Average per active member', directoryStatus === 'ready' || members.length ? fmtFull(average) : '—'],
                    ].map(([label, value]) => (
                      <View key={label} style={styles.breakdownRow}>
                        <Text style={[styles.label, styles.breakdownLabel]}>{label}</Text>
                        <Text style={styles.breakdownValue}>{value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlassCard>

              <View style={styles.directoryList}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>All members</Text>
                {members.length > 0 ? (
                  <GlassCard style={styles.listCard} padding={0}>
                    {members.map((member, index) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        isSelf={member.id === user?.id}
                        divided={index > 0}
                        onPress={() => navigation.navigate('MemberDetail', { member })}
                      />
                    ))}
                  </GlassCard>
                ) : directoryStatus === 'loading' ? (
                  <ActivityIndicator accessibilityLabel="Loading members" color={COLORS.accent} />
                ) : directoryStatus === 'error' ? (
                  <Pressable accessibilityRole="button" onPress={loadDirectory} style={styles.disclosure}>
                    <Text style={styles.link}>Couldn’t load members. Retry</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.label}>No members yet</Text>
                )}
              </View>
            </View>
          ) : (
            <ContributionsScreen
              embedded
              view={tab}
              endRef={endRef}
              addRef={addRef}
              refreshRef={refreshRef}
            />
          )}

          <TabBarSpacer />
        </ScrollView>
      </View>
    </TabSwipeArea>
  );
};

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  frame: { flex: 1, width: '100%', maxWidth: CONTENT_WIDTH, alignSelf: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  tabBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  tabs: { flex: 1, minWidth: 0, flexDirection: 'row' },
  wrappedTabs: { flexWrap: 'wrap' },
  tab: { minHeight: 48, minWidth: 0, justifyContent: 'center', alignItems: 'center', flex: 1, padding: SPACING.xs, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  longTab: { flex: 1.75 },
  tabActive: { borderBottomColor: COLORS.accent },
  tabText: { ...TYPE.tab, color: COLORS.textMuted, textAlign: 'center' },
  tabTextActive: { color: COLORS.accent },
  refreshButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
  refreshHovered: { backgroundColor: COLORS.accent + '0D' },
  directory: { gap: SPACING.lg },
  directoryWide: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xxl },
  summaryWide: { width: 320 },
  label: { ...TYPE.secondary, color: COLORS.textSecondary },
  value: { ...TYPE.portfolioValue, color: COLORS.textPrimary, marginTop: SPACING.xs },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: SPACING.lg, rowGap: SPACING.xs, marginTop: SPACING.xs },
  metricValue: { ...TYPE.smallValue },
  disclosure: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: -SPACING.sm },
  link: { ...TYPE.button, color: COLORS.accent, flexShrink: 1 },
  expandedIcon: { transform: [{ rotate: '180deg' }] },
  breakdown: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider, gap: SPACING.sm },
  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: SPACING.sm },
  breakdownLabel: { flexGrow: 1, flexShrink: 1, flexBasis: 110 },
  breakdownValue: { ...TYPE.smallValue, color: COLORS.textPrimary, marginLeft: 'auto', maxWidth: '100%', textAlign: 'right' },
  directoryList: { flex: 1, minWidth: 0 },
  sectionTitle: { ...TYPE.sectionTitle, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  listCard: { overflow: 'hidden', borderRadius: RADIUS.lg },
}));
