import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Alert } from '../utils/alert';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { getErrorMessage } from '../utils/errors';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ContributionsScreen = ({ route, navigation }) => {
  const { user } = useAuthStore();
  const {
    members,
    fetchMembers,
    fetchPoolStatus,
    fetchCashHandover,
    settleMonth,
    setBuyingMember,
    syncPools,
  } = usePortfolioStore();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.is_staff || user?.is_admin || user?.role === 'admin';

  const [contributions, setContributions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [availableMonthsList, setAvailableMonthsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear().toString());
  const [generateMonthIndex, setGenerateMonthIndex] = useState(new Date().getMonth());
  const [generateAmount, setGenerateAmount] = useState('1000');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContribution, setEditingContribution] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  // ── Pool settlement ──
  const [poolStatus, setPoolStatus] = useState(null);
  const [handover, setHandover] = useState(null);
  const [showHandover, setShowHandover] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [savingBuyer, setSavingBuyer] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // The settlement card always describes one specific month: whichever is
  // filtered, or the current one when viewing everything.
  const poolMonth = selectedMonth || new Date().toISOString().slice(0, 7);

  const memberId = route?.params?.memberId;
  const memberName = route?.params?.memberName;

  const fetchContributions = useCallback(async () => {
    try {
      let url = '/contributions/';
      const params = [];
      if (memberId) params.push('member_id=' + memberId);
      if (selectedMonth) params.push('month=' + selectedMonth);
      if (params.length > 0) url += '?' + params.join('&');
      const response = await api.get(url);
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setContributions(data);
    } catch (error) {
      console.error('Error fetching contributions:', error?.response?.data || error.message);
    }
  }, [memberId, selectedMonth]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/contributions/summary/');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error?.response?.data || error.message);
    }
  }, []);

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await api.get('/contributions/months/');
      setAvailableMonthsList(response.data);
    } catch (error) {
      console.error('Error fetching months:', error?.response?.data || error.message);
    }
  }, []);

  const loadPoolStatus = useCallback(async () => {
    if (!isAdmin) return;
    setPoolLoading(true);
    const [status, plan] = await Promise.all([
      fetchPoolStatus(poolMonth),
      fetchCashHandover(poolMonth),
    ]);
    setPoolStatus(status.success ? status.data : null);
    setHandover(plan.success ? plan.data : null);
    setPoolLoading(false);
  }, [isAdmin, poolMonth, fetchPoolStatus, fetchCashHandover]);

  // Every mutation on this screen can move the pool position, so all of them
  // refresh through here rather than each picking their own subset.
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchContributions(),
      fetchSummary(),
      fetchAvailableMonths(),
      loadPoolStatus(),
    ]);
  }, [fetchContributions, fetchSummary, fetchAvailableMonths, loadPoolStatus]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContributions(), fetchSummary(), fetchAvailableMonths()]);
    setLoading(false);
  }, [fetchContributions, fetchSummary, fetchAvailableMonths]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { fetchContributions(); }, [selectedMonth]);
  useEffect(() => { loadPoolStatus(); }, [loadPoolStatus]);
  useEffect(() => { if (isAdmin) fetchMembers(); }, [isAdmin, fetchMembers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const handleGenerateContributions = async () => {
    const monthDate = generateYear + '-' + String(generateMonthIndex + 1).padStart(2, '0');
    const displayName = MONTH_NAMES[generateMonthIndex] + ' ' + generateYear;
    Alert.alert(
      'Generate Contributions',
      'Create Rs.' + generateAmount + ' contribution for all active members for ' + displayName + '?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            setShowGenerateModal(false);
            try {
              const response = await api.post('/contributions/generate/', {
                month: monthDate,
                amount: parseFloat(generateAmount),
              });
              Toast.show({ type: 'success', text1: 'Generated', text2: response.data.message });
              await refreshAll();

              // Generation can pre-bill unspent pool cash to last month's
              // buyer. Say so, otherwise that member's row looks wrong.
              const carried = response.data.carried_forward || {};
              const carriedLines = Object.keys(carried)
                .filter((id) => Number(carried[id]) > 0)
                .map((id) => {
                  const name = members.find((m) => String(m.id) === String(id))?.name || 'A member';
                  return name + ' owes Rs.' + Number(carried[id]).toFixed(2)
                    + ' of unspent pool cash this month';
                });
              if (carriedLines.length > 0) {
                Alert.alert('Adjustments Applied', carriedLines.join('\n'));
              }
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: getErrorMessage(error, 'Failed to generate'),
              });
            } finally { setGenerating(false); }
          },
        },
      ]
    );
  };

  const handleCleanupContributions = () => {
    const message = selectedMonth
      ? 'Remove all UNPAID contributions for ' + formatMonth(selectedMonth) + '?'
      : 'Remove all UNPAID contributions from ALL previous months?';
    Alert.alert('Cleanup Unpaid', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Cleanup',
        style: 'destructive',
        onPress: async () => {
          setCleaning(true);
          try {
            const body = selectedMonth ? { month: selectedMonth } : {};
            const response = await api.post('/contributions/cleanup/', body);
            Toast.show({ type: 'success', text1: 'Done', text2: response.data.message });
            await refreshAll();
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(error, 'Failed to cleanup') });
          } finally { setCleaning(false); }
        },
      },
    ]);
  };

  const handleDeleteMonth = (month) => {
    Alert.alert(
      'Delete Entire Month',
      'Delete ALL contributions (paid + unpaid) for ' + formatMonth(month) + '? Cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post('/contributions/delete-month/', { month: month });
              Toast.show({ type: 'success', text1: 'Deleted', text2: response.data.message });
              setSelectedMonth(null);
              await refreshAll();
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(error, 'Failed to delete') });
            }
          },
        },
      ]
    );
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.post('/contributions/' + id + '/mark_paid/');
      Toast.show({ type: 'success', text1: 'Marked as Paid' });
      await refreshAll();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(error, 'Failed to update') });
    }
  };

  const handleMarkUnpaid = async (id) => {
    try {
      await api.post('/contributions/' + id + '/mark_unpaid/');
      Toast.show({ type: 'success', text1: 'Marked as Unpaid' });
      await refreshAll();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(error, 'Failed to update') });
    }
  };

  const openEditModal = (contrib) => {
    setEditingContribution(contrib);
    setEditAmount(String(contrib.amount || '1000'));
    setShowEditModal(true);
  };

  const handleUpdateAmount = async () => {
    if (!editingContribution || !editAmount) return;
    try {
      await api.post('/contributions/' + editingContribution.id + '/update_amount/', {
        amount: parseFloat(editAmount),
      });
      Toast.show({ type: 'success', text1: 'Amount Updated' });
      setShowEditModal(false);
      setEditingContribution(null);
      await refreshAll();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: getErrorMessage(error, 'Failed to update amount') });
    }
  };

  const runSettle = async (force) => {
    setSettling(true);
    const result = await settleMonth(poolMonth, { force });
    setSettling(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Month Settled',
        text2: result.data.message,
      });
      await refreshAll();
      return;
    }

    // The backend blocks a settle while contributions are outstanding, because
    // the shortfall would otherwise be blamed on the buyer. Offer the override.
    if (!force && /unpaid/i.test(result.error)) {
      Alert.alert(
        'Unpaid Contributions',
        result.error + '\n\nSettle anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settle Anyway', style: 'destructive', onPress: () => runSettle(true) },
        ]
      );
      return;
    }

    Toast.show({ type: 'error', text1: 'Cannot Settle', text2: result.error });
  };

  const handleSettle = () => {
    const available = Number(poolStatus?.available_cash || 0);
    const spent = Number(poolStatus?.total_invested || 0);
    const carried = Number(poolStatus?.opening_cash || 0);
    const late = Number(poolStatus?.late_sale_proceeds) || 0;
    const usable = (Number(poolStatus?.sale_proceeds) || 0) - late;
    // Spell out where the pool's money came from, so the buyer is never
    // charged for cash the pool already had.
    const sources = ['Rs.' + available.toFixed(2) + ' of pool cash available'];
    if (carried > 0) sources.push('incl. Rs.' + carried.toFixed(2) + ' carried over');
    if (usable > 0) sources.push('incl. Rs.' + usable.toFixed(2) + ' from share sales');
    if (late > 0) sources.push('(Rs.' + late.toFixed(2) + ' sold after the buy, kept for next month)');
    Alert.alert(
      'Settle ' + formatMonth(poolMonth),
      sources.join('\n') + '\nSpent Rs.' + spent.toFixed(2) + '.\n\n'
        + (spent > available
          ? 'Only the Rs.' + (spent - available).toFixed(2) + ' shortfall is charged to '
            + (poolStatus?.buying_member_name || 'the buyer') + ', and repaid from their next installments.'
          : 'Rs.' + (available - spent).toFixed(2) + ' stays in the pool for the next purchase.'),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settle', onPress: () => runSettle(false) },
      ]
    );
  };

  const handleSelectBuyer = async (memberIdToSet) => {
    setSavingBuyer(true);
    const result = await setBuyingMember(poolMonth, memberIdToSet);
    setSavingBuyer(false);
    setShowBuyerModal(false);

    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Buyer Set',
        text2: result.data.buying_member_name + ' bought for ' + result.data.month_name,
      });
      await refreshAll();
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: result.error });
    }
  };

  const handleSyncPools = async () => {
    setSyncing(true);
    const result = await syncPools();
    setSyncing(false);
    if (result.success) {
      Toast.show({ type: 'success', text1: 'Pools Synced', text2: result.data.message });
      await refreshAll();
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: result.error });
    }
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    try {
      const parts = String(monthStr).split('-');
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return MONTH_NAMES[monthIndex] + ' ' + year;
      }
      return monthStr;
    } catch (e) {
      return monthStr;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (num >= 100000) return 'Rs.' + (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return 'Rs.' + (num / 1000).toFixed(1) + 'K';
    return 'Rs.' + num.toFixed(0);
  };

  // The abbreviated formatter above is for headline totals; settlement figures
  // are small and must be exact, or "Rs.0.8K" hides an Rs.810 obligation.
  const formatExact = (amount) =>
    'Rs.' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  /**
   * Why a row's amount is not the plain monthly share. Without these lines a
   * member just sees an unexplained number and assumes the app is wrong.
   */
  const adjustmentNotes = (contrib) => {
    const notes = [];
    const advance = parseFloat(contrib.advance_credit) || 0;
    const carry = parseFloat(contrib.carry_forward) || 0;
    const topup = parseFloat(contrib.buyer_topup) || 0;
    const base = parseFloat(contrib.base_amount) || 0;

    if (advance > 0) {
      notes.push(formatExact(base) + ' - ' + formatExact(advance) + ' advance repaid');
    }
    // Settlement never sets this any more - unspent money stays in the pool -
    // so it only appears when an admin has added a one-off charge by hand.
    if (carry > 0) {
      notes.push('+ ' + formatExact(carry) + ' extra charge');
    }
    if (topup > 0) {
      notes.push('Bought this month, paid ' + formatExact(topup) + ' extra');
    }
    return notes;
  };

  const isAdjusted = (contrib) => (
    (parseFloat(contrib.advance_credit) || 0) > 0
    || (parseFloat(contrib.buyer_topup) || 0) > 0
  );

  // A sale only counts as spending power if it landed before the month's
  // purchase. Anything later is real money, but it sits below the line.
  const lateSales = Number(poolStatus?.late_sale_proceeds) || 0;
  const usableSales = (Number(poolStatus?.sale_proceeds) || 0) - lateSales;

  const groupedContributions = contributions.reduce((groups, contrib) => {
    const month = contrib.month || 'Unknown';
    if (!groups[month]) groups[month] = [];
    groups[month].push(contrib);
    return groups;
  }, {});

  const sortedMonths = Object.keys(groupedContributions).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader title={memberName ? memberName + "'s Contributions" : 'Contributions'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={memberName ? memberName + "'s Contributions" : 'Contributions'}
        showBack={!!memberName}
        onBack={memberName ? () => navigation.goBack() : undefined}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {summary && (
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{summary.current_month}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Paid</Text>
                <Text style={[styles.summaryValue, { color: COLORS.profit }]}>{summary.paid_count}/{summary.total_members}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={[styles.summaryValue, { color: COLORS.loss }]}>{summary.unpaid_count}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>This Month</Text>
                <Text style={[styles.summaryValue, { color: COLORS.accent }]}>{formatCurrency(summary.current_month_collected)}</Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Collected (All Time)</Text>
              <Text style={styles.totalValue}>{formatCurrency(summary.total_collected_all_time)}</Text>
            </View>
          </GlassCard>
        )}

        <View style={styles.monthFilterContainer}>
          <Text style={styles.filterLabel}>Filter by Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
            <TouchableOpacity
              style={[styles.monthChip, !selectedMonth && styles.monthChipActive]}
              onPress={() => setSelectedMonth(null)}
            >
              <Text style={[styles.monthChipText, !selectedMonth && styles.monthChipTextActive]}>All</Text>
            </TouchableOpacity>
            {availableMonthsList.map((m) => (
              <TouchableOpacity
                key={m.month}
                style={[styles.monthChip, selectedMonth === m.month && styles.monthChipActive]}
                onPress={() => setSelectedMonth(m.month)}
              >
                <Text style={[styles.monthChipText, selectedMonth === m.month && styles.monthChipTextActive]}>{m.month_name}</Text>
                <View style={styles.monthChipBadge}>
                  <Text style={styles.monthChipBadgeText}>{m.paid}/{m.total}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {isAdmin && (poolStatus?.unsettled_months?.length > 0) && (
          <View style={styles.unsettledBanner}>
            <View style={styles.unsettledHeader}>
              <Ionicons name="alert-circle" size={18} color={COLORS.loss} />
              <Text style={styles.unsettledTitle}>
                {poolStatus.unsettled_months.length} month
                {poolStatus.unsettled_months.length > 1 ? 's need' : ' needs'} settling
              </Text>
            </View>
            <View style={styles.unsettledChips}>
              {poolStatus.unsettled_months.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.unsettledChip}
                  onPress={() => setSelectedMonth(m)}
                >
                  <Text style={styles.unsettledChipText}>{formatMonth(m)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.unsettledHint}>
              Tap a month to open its pool status and settle it.
            </Text>
          </View>
        )}

        {isAdmin && (
          <GlassCard style={styles.poolCard}>
            <View style={styles.poolHeader}>
              <View style={styles.poolTitleBlock}>
                <Text style={styles.poolTitle}>Pool Status</Text>
                <Text style={styles.poolMonthText}>{formatMonth(poolMonth)}</Text>
              </View>
              {poolLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Text
                  style={[
                    styles.settledBadge,
                    poolStatus?.is_settled ? styles.settledBadgePaid : styles.settledBadgeOpen,
                  ]}
                >
                  {poolStatus?.is_settled ? 'SETTLED' : 'OPEN'}
                </Text>
              )}
            </View>

            {/* The pool is one pot of money. Showing only "collected vs spent"
                is what made a buyer look out of pocket for cash the pool
                already had, so every source is listed. */}
            <View style={styles.ledger}>
              {Number(poolStatus?.opening_cash) > 0 && (
                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>Carried over</Text>
                  <Text style={styles.ledgerValue}>{formatExact(poolStatus.opening_cash)}</Text>
                </View>
              )}
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerLabel}>Contributions</Text>
                <Text style={styles.ledgerValue}>{formatExact(poolStatus?.base_collected)}</Text>
              </View>
              {usableSales > 0 && (
                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>Share sales</Text>
                  <Text style={[styles.ledgerValue, { color: COLORS.profit }]}>
                    {formatExact(usableSales)}
                  </Text>
                </View>
              )}
              <View style={[styles.ledgerRow, styles.ledgerTotalRow]}>
                <Text style={styles.ledgerTotalLabel}>Pool cash available</Text>
                <Text style={styles.ledgerTotalValue}>{formatExact(poolStatus?.available_cash)}</Text>
              </View>
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerLabel}>Spent on shares</Text>
                <Text style={styles.ledgerValue}>-{formatExact(poolStatus?.total_invested)}</Text>
              </View>
              {/* Below the line on purpose: this money landed after the order
                  was placed, so it could not have paid for it. */}
              {lateSales > 0 && (
                <View style={styles.ledgerRow}>
                  <Text style={styles.ledgerLabel}>Share sales, after the buy</Text>
                  <Text style={[styles.ledgerValue, { color: COLORS.profit }]}>
                    {formatExact(lateSales)}
                  </Text>
                </View>
              )}
              <View style={[styles.ledgerRow, styles.ledgerTotalRow]}>
                <Text style={styles.ledgerTotalLabel}>Left in pool</Text>
                <Text style={styles.ledgerTotalValue}>{formatExact(poolStatus?.closing_cash)}</Text>
              </View>
            </View>

            {/* The gap, said in plain words rather than as a signed number. */}
            {Number(poolStatus?.overspend) > 0 && (
              <View style={[styles.poolNote, styles.poolNoteWarn]}>
                <Text style={styles.poolNoteText}>
                  {poolStatus.buying_member_name || 'Buyer'} paid{' '}
                  {formatExact(poolStatus.overspend)} extra from their own pocket.
                </Text>
                <Text style={styles.poolNoteSub}>
                  That is what was still short after all{' '}
                  {formatExact(poolStatus.available_cash)} of pool cash was used.
                </Text>
                {lateSales > 0 && (
                  <Text style={styles.poolNoteSub}>
                    The {formatExact(lateSales)} from share sales arrived after the
                    purchase, so it could not cover this. It is waiting in the pool
                    for the next buy.
                  </Text>
                )}
                {poolStatus.next_installment != null && (
                  <Text style={styles.poolNoteSub}>
                    Next installment {formatExact(poolStatus.next_installment)} after reimbursement.
                  </Text>
                )}
              </View>
            )}
            {Number(poolStatus?.underspend) > 0 && (
              <View style={[styles.poolNote, styles.poolNoteInfo]}>
                <Text style={styles.poolNoteText}>
                  {formatExact(poolStatus.underspend)} stays in the pool.
                </Text>
                <Text style={styles.poolNoteSub}>
                  The next purchase spends it on top of that month's
                  contributions. Nobody is billed for it.
                </Text>
              </View>
            )}

            {/* The pool has no account of its own, so its spare cash is in
                members' hands. This is who has to send it on. */}
            {handover?.transfers?.length > 0 && (
              <View style={styles.handover}>
                <TouchableOpacity
                  style={styles.handoverHeader}
                  onPress={() => setShowHandover(!showHandover)}
                >
                  <View style={styles.handoverTitleBlock}>
                    <Text style={styles.handoverTitle}>
                      Send to {handover.buying_member_name || 'the buyer'}
                    </Text>
                    <Text style={styles.handoverSubtitle}>
                      {formatExact(handover.expected_to_buyer)} from{' '}
                      {handover.transfers.length} member
                      {handover.transfers.length > 1 ? 's' : ''}
                      {Number(handover.pool_cash_in_hands) > 0
                        ? ', incl. ' + formatExact(handover.pool_cash_in_hands) + ' of pool cash'
                        : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name={showHandover ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {showHandover && (
                  <View style={styles.handoverList}>
                    {handover.transfers.map((row) => (
                      <View key={row.member} style={styles.handoverRow}>
                        <View style={styles.handoverWho}>
                          <Text style={styles.handoverName}>{row.member_name}</Text>
                          {/* Only worth spelling out when it is not just
                              their plain monthly contribution. */}
                          {Number(row.holding) > 0 && (
                            <Text style={styles.handoverBreakdown}>
                              {formatExact(row.contribution)} contribution +{' '}
                              {formatExact(row.holding)} pool cash held
                            </Text>
                          )}
                          {row.status !== 'paid' && (
                            <Text style={styles.handoverUnpaid}>Not paid yet</Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.handoverAmount,
                            Number(row.holding) > 0 && { color: COLORS.accent },
                          ]}
                        >
                          {formatExact(row.total)}
                        </Text>
                      </View>
                    ))}

                    {handover.buyer_keeps && (
                      <View style={styles.handoverRow}>
                        <View style={styles.handoverWho}>
                          <Text style={styles.handoverName}>
                            {handover.buyer_keeps.member_name}
                          </Text>
                          <Text style={styles.handoverBreakdown}>
                            Buying this month — keeps their own share
                          </Text>
                        </View>
                        <Text style={styles.handoverAmount}>
                          {formatExact(handover.buyer_keeps.total)}
                        </Text>
                      </View>
                    )}

                    {Number(handover.unassigned_cash) > 0 && (
                      <Text style={styles.handoverNote}>
                        {formatExact(handover.unassigned_cash)} was paid in during an
                        earlier month that bought nothing, so no one is recorded as
                        holding it.
                      </Text>
                    )}
                    <Text style={styles.handoverNote}>
                      Pool cash held is the pool's money, not a debt. Sending it on
                      does not change anyone's contribution or ownership share.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.buyerRow}>
              <View style={styles.buyerTextBlock}>
                <Text style={styles.poolLabel}>Buying Member</Text>
                <Text style={styles.buyerName}>
                  {poolStatus?.buying_member_name || 'Not set'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.buyerChangeButton}
                onPress={() => setShowBuyerModal(true)}
              >
                <Ionicons name="swap-horizontal" size={16} color={COLORS.accent} />
                <Text style={styles.buyerChangeText}>
                  {poolStatus?.buying_member ? 'Change' : 'Select'}
                </Text>
              </TouchableOpacity>
            </View>

            {!poolStatus?.buying_member && (
              <Text style={styles.poolWarning}>
                No buyer recorded for this month. Set one before settling.
              </Text>
            )}
            {Number(poolStatus?.unpaid_count) > 0 && (
              <Text style={styles.poolWarning}>
                {poolStatus.unpaid_count} unpaid — collect first
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.settleButton,
                (!poolStatus?.buying_member || settling) && styles.settleButtonDisabled,
              ]}
              onPress={handleSettle}
              disabled={!poolStatus?.buying_member || settling}
            >
              {settling
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="checkmark-done" size={18} color="#FFF" />}
              <Text style={styles.settleButtonText}>
                {settling
                  ? 'Settling...'
                  : poolStatus?.is_settled ? 'Re-settle Month' : 'Settle Month'}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {isAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity style={[styles.adminButton, styles.generateButton]} onPress={() => setShowGenerateModal(true)} disabled={generating}>
              {generating ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="add-circle-outline" size={18} color="#FFF" />}
              <Text style={styles.adminButtonText}>{generating ? 'Generating...' : 'Generate Month'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.adminButton, styles.cleanupButton]} onPress={handleCleanupContributions} disabled={cleaning}>
              {cleaning ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="trash-outline" size={18} color="#FFF" />}
              <Text style={styles.adminButtonText}>{cleaning ? 'Cleaning...' : 'Cleanup Unpaid'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAdmin && selectedMonth && (
          <TouchableOpacity style={styles.deleteMonthButton} onPress={() => handleDeleteMonth(selectedMonth)}>
            <Ionicons name="close-circle-outline" size={18} color={COLORS.loss} />
            <Text style={styles.deleteMonthText}>Delete all entries for {formatMonth(selectedMonth)}</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSyncPools}
            disabled={syncing}
          >
            {syncing
              ? <ActivityIndicator size="small" color={COLORS.textSecondary} />
              : <Ionicons name="git-compare-outline" size={16} color={COLORS.textSecondary} />}
            <Text style={styles.syncButtonText}>
              {syncing ? 'Syncing pools...' : 'Rebuild monthly pool totals'}
            </Text>
          </TouchableOpacity>
        )}

        {sortedMonths.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#555" />
            <Text style={styles.emptyText}>No contributions found</Text>
            {isAdmin && <Text style={styles.emptySubtext}>Tap "Generate Month" to create entries</Text>}
          </GlassCard>
        ) : (
          sortedMonths.map((month) => (
            <View key={month} style={styles.monthSection}>
              <View style={styles.monthHeaderRow}>
                <Text style={styles.monthHeader}>{formatMonth(month)}</Text>
                <Text style={styles.monthCount}>
                  {groupedContributions[month].filter(c => c.status === 'paid').length}/{groupedContributions[month].length} paid
                </Text>
              </View>
              {groupedContributions[month].map((contrib) => (
                <GlassCard key={contrib.id} style={styles.contributionCard}>
                  <View style={styles.contributionRow}>
                    <View style={styles.contributionLeft}>
                      <View style={[styles.statusDot, { backgroundColor: contrib.status === 'paid' ? COLORS.profit : COLORS.loss }]} />
                      <View style={styles.contributionTextBlock}>
                        <Text style={styles.memberName}>{contrib.member_name || 'Member'}</Text>
                        {/* payable_amount is the cash actually handed over; it
                            differs from `amount` whenever pool cash is being
                            returned, which is not new capital. */}
                        <Text style={styles.contributionAmount}>
                          {formatExact(contrib.payable_amount ?? contrib.amount)}
                        </Text>
                        {adjustmentNotes(contrib).map((note) => (
                          <Text key={note} style={styles.adjustmentNote}>{note}</Text>
                        ))}
                        {(parseFloat(contrib.buyer_topup) || 0) > 0 && (
                          <View style={styles.buyerTag}>
                            <Text style={styles.buyerTagText}>BUYER</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.contributionRight}>
                      <Text style={[styles.statusBadge, {
                        color: contrib.status === 'paid' ? COLORS.profit : COLORS.loss,
                        backgroundColor: contrib.status === 'paid' ? COLORS.profitBg : COLORS.lossBg,
                      }]}>{contrib.status === 'paid' ? 'PAID' : 'UNPAID'}</Text>
                      {isAdmin && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(contrib)}>
                            <Ionicons
                              name="pencil-outline"
                              size={18}
                              color={isAdjusted(contrib) ? COLORS.warning : COLORS.accent}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconButton} onPress={() => contrib.status === 'paid' ? handleMarkUnpaid(contrib.id) : handleMarkPaid(contrib.id)}>
                            <Ionicons name={contrib.status === 'paid' ? 'close-circle-outline' : 'checkmark-circle-outline'} size={22} color={contrib.status === 'paid' ? COLORS.loss : COLORS.profit} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                  {contrib.paid_date && <Text style={styles.paidDate}>Paid on {new Date(contrib.paid_date).toLocaleDateString('en-IN')}</Text>}
                </GlassCard>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showGenerateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Generate Contributions</Text>
            <Text style={styles.modalSubtitle}>Create entries for all active members</Text>
            <Text style={styles.modalLabel}>Year</Text>
            <View style={styles.yearSelector}>
              <TouchableOpacity style={styles.yearButton} onPress={() => setGenerateYear(String(parseInt(generateYear) - 1))}>
                <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{generateYear}</Text>
              <TouchableOpacity style={styles.yearButton} onPress={() => setGenerateYear(String(parseInt(generateYear) + 1))}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Month</Text>
            <View style={styles.monthGrid}>
              {MONTH_NAMES.map((m, index) => (
                <TouchableOpacity key={m} style={[styles.monthGridItem, generateMonthIndex === index && styles.monthGridItemActive]} onPress={() => setGenerateMonthIndex(index)}>
                  <Text style={[styles.monthGridText, generateMonthIndex === index && styles.monthGridTextActive]}>{m.substring(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Amount per member (Rs.)</Text>
            <TextInput style={styles.modalInput} value={generateAmount} onChangeText={setGenerateAmount} keyboardType="numeric" placeholder="1000" placeholderTextColor="#666" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowGenerateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleGenerateContributions}>
                <Text style={styles.modalConfirmText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Amount</Text>
            <Text style={styles.modalSubtitle}>
              {editingContribution?.member_name || 'Member'} - {editingContribution?.month ? formatMonth(editingContribution.month) : ''}
            </Text>
            {editingContribution && isAdjusted(editingContribution) && (
              <View style={styles.editWarning}>
                <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
                <Text style={styles.editWarningText}>
                  This amount was set by the settlement (advance repayment or buyer
                  top-up). Editing it by hand will be overwritten the next time the
                  month is settled — and can double-charge the member.
                </Text>
              </View>
            )}
            <Text style={styles.modalLabel}>New Amount (Rs.)</Text>
            <TextInput style={styles.modalInput} value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" placeholder="1000" placeholderTextColor="#666" autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowEditModal(false); setEditingContribution(null); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUpdateAmount}>
                <Text style={styles.modalConfirmText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showBuyerModal} transparent animationType="fade" onRequestClose={() => setShowBuyerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Buying Member</Text>
            <Text style={styles.modalSubtitle}>
              Whose demat account was used for {formatMonth(poolMonth)}?
            </Text>
            {savingBuyer ? (
              <ActivityIndicator size="large" color={COLORS.accent} style={{ marginVertical: SPACING.lg }} />
            ) : (
              <ScrollView style={styles.buyerPickerList}>
                {members.map((member) => {
                  const active = String(member.id) === String(poolStatus?.buying_member);
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.buyerOption, active && styles.buyerOptionActive]}
                      onPress={() => handleSelectBuyer(member.id)}
                    >
                      <Text style={[styles.buyerOptionText, active && styles.buyerOptionTextActive]}>
                        {member.name}
                      </Text>
                      {active && <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />}
                    </TouchableOpacity>
                  );
                })}
                {members.length === 0 && (
                  <Text style={styles.emptySubtext}>No active members found</Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowBuyerModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ContributionsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1, paddingHorizontal: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { marginTop: SPACING.md, padding: SPACING.lg },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  summaryDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  monthFilterContainer: { marginTop: SPACING.md },
  filterLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  monthScroll: { flexDirection: 'row' },
  monthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardBg, marginRight: 8, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  monthChipTextActive: { color: '#FFF' },
  monthChipBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  monthChipBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  adminActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  adminButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.md, gap: 6 },
  generateButton: { backgroundColor: COLORS.accent },
  cleanupButton: { backgroundColor: COLORS.loss },
  adminButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  deleteMonthButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.loss },
  deleteMonthText: { fontSize: 13, color: COLORS.loss, fontWeight: '600' },
  monthSection: { marginTop: SPACING.lg },
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  monthHeader: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  monthCount: { fontSize: 12, color: COLORS.textSecondary },
  contributionCard: { marginBottom: SPACING.sm, padding: SPACING.md },
  contributionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  // flex + minWidth keep the name/amount block inside the card. Without them
  // it sizes to its content and shoves the badge and buttons off the screen.
  contributionLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  contributionAmount: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  // Stacked, and never shrunk: on a narrow phone a badge beside two buttons
  // does not fit next to a member name, and the controls are what get cut.
  contributionRight: { flexShrink: 0, alignItems: 'flex-end', gap: 6 },
  statusBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', letterSpacing: 0.5 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // 40pt so the paid/unpaid toggle is a comfortable tap target, not an icon.
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  paidDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, marginLeft: 22 },
  emptyCard: { marginTop: SPACING.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  // Pool settlement
  unsettledBanner: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.loss, backgroundColor: COLORS.lossBg },
  unsettledHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unsettledTitle: { fontSize: 14, fontWeight: '800', color: COLORS.loss },
  unsettledChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm },
  unsettledChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: COLORS.loss, backgroundColor: COLORS.cardBg },
  unsettledChipText: { fontSize: 12, fontWeight: '700', color: COLORS.loss },
  unsettledHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: SPACING.sm },
  poolCard: { marginTop: SPACING.md, padding: SPACING.lg },
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  poolTitleBlock: { flex: 1, minWidth: 0 },
  poolTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  poolMonthText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  settledBadge: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  settledBadgePaid: { color: COLORS.profit, backgroundColor: COLORS.profitBg },
  settledBadgeOpen: { color: COLORS.warning, backgroundColor: COLORS.warningBg },
  poolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  poolItem: { flex: 1, alignItems: 'center' },
  poolLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  poolValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  ledger: { gap: 2 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, paddingVertical: 4 },
  ledgerLabel: { flex: 1, minWidth: 0, fontSize: 13, color: COLORS.textSecondary },
  ledgerValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  ledgerTotalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.divider },
  ledgerTotalLabel: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  ledgerTotalValue: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
  handover: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  handoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  handoverTitleBlock: { flex: 1, minWidth: 0 },
  handoverTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  handoverSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },
  handoverList: { marginTop: SPACING.sm, gap: 2 },
  handoverRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm, paddingVertical: 6 },
  handoverWho: { flex: 1, minWidth: 0 },
  handoverName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  handoverBreakdown: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, lineHeight: 15 },
  handoverUnpaid: { fontSize: 11, fontWeight: '700', color: COLORS.loss, marginTop: 2 },
  handoverAmount: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  handoverNote: { fontSize: 11, color: COLORS.textMuted, marginTop: SPACING.sm, lineHeight: 16 },
  poolNote: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  poolNoteWarn: { borderColor: COLORS.warning + '55', backgroundColor: COLORS.warningBg },
  poolNoteInfo: { borderColor: COLORS.accent + '55', backgroundColor: 'rgba(0, 208, 156, 0.10)' },
  poolNoteText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 19 },
  poolNoteSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 17 },
  buyerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  buyerTextBlock: { flex: 1, minWidth: 0 },
  buyerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  buyerChangeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent },
  buyerChangeText: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  poolWarning: { fontSize: 12, color: COLORS.warning, marginTop: SPACING.sm, fontWeight: '600' },
  settleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.md, paddingVertical: 13, borderRadius: RADIUS.md, backgroundColor: COLORS.accent },
  settleButtonDisabled: { backgroundColor: COLORS.buttonDisabled },
  settleButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  syncButtonText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  contributionTextBlock: { flex: 1, minWidth: 0 },
  adjustmentNote: { fontSize: 11, color: COLORS.accent, marginTop: 2, lineHeight: 15 },
  buyerTag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: COLORS.warningBg },
  buyerTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: COLORS.warning },
  editWarning: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.warning + '55', backgroundColor: COLORS.warningBg, marginTop: SPACING.md },
  editWarningText: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  buyerPickerList: { maxHeight: 280, marginTop: SPACING.sm },
  buyerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  buyerOptionActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '18' },
  buyerOptionText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  buyerOptionTextActive: { color: COLORS.accent, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalContent: { backgroundColor: COLORS.cardBg, borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  modalInput: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: COLORS.borderLight, textAlign: 'center' },
  yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  yearButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  yearText: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthGridItem: { width: '23%', paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderLight },
  monthGridItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthGridText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  monthGridTextActive: { color: '#FFF', fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, alignItems: 'center' },
  modalCancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
