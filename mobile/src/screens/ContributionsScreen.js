import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { AppIcon } from '../components/Icon';
import { ArrowDown2, ArrowLeft2, ArrowRight2, More, Eraser, CalendarRemove, Refresh2 } from 'iconsax-react-native';
import { DialogCard } from '../components/DialogCard';
import { PremiumInput } from '../components/PremiumInput';
import { MonthPickerDialog } from '../components/MonthPickerDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Alert } from '../utils/alert';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';
import { usePortfolioStore } from '../store/portfolioStore';
import { getErrorMessage } from '../utils/errors';
import { COLORS, SPACING, FONTS, RADIUS, themedStyles, TYPE } from '../theme/colors';
import { FormCard } from '../components/FormScreen';
import { BuyerPicker } from '../components/BuyerPicker';
import { SummaryCard } from '../components/SummaryCard';
import { PremiumButton } from '../components/PremiumButton';
import { UserAvatar } from '../components/UserAvatar';
import { PreviewRow, PreviewTotal } from '../components/PreviewCard';
import { TabBarSpacer } from '../components/TabBarSpacer';
import { ScreenHeader } from '../components/ScreenHeader';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Members pay whole rupees, so ".00" is dropped; a real fraction still shows.
const fmtFull = (v) =>
  '₹' + (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const ContributionsScreen = ({ route, navigation, embedded = false, view = 'contributions', endRef, addRef }) => {
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
  // History tab: show only unpaid or only paid entries, across all months.
  const [histFilter, setHistFilter] = useState('unpaid');
  const isHistory = embedded && view === 'history';
  // History data: unpaid is one small request; paid loads one month at a time
  // (latest first) as the user scrolls, so the API is never asked for everything.
  const [histData, setHistData] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histMore, setHistMore] = useState(false);
  const [paidNext, setPaidNext] = useState(0);
  const [histVersion, setHistVersion] = useState(0);
  // Paid tab: one chosen month, or null for every month (latest first).
  const [histMonth, setHistMonth] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const moreBusy = useRef(false);
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
  const [syncing, setSyncing] = useState(false);

  // The settlement card always describes one specific month: whichever is
  // filtered, or the current one when viewing everything.
  const poolMonth = selectedMonth || new Date().toISOString().slice(0, 7);

  const memberId = route?.params?.memberId;
  const memberName = route?.params?.memberName;

  const fetchContributions = useCallback(async () => {
    // The History tab loads its own data, a month at a time.
    if (isHistory) return;
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
  }, [memberId, selectedMonth, isHistory]);

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
    setHistVersion((v) => v + 1);
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

  const paidMonths = useMemo(
    () => availableMonthsList.filter((m) => Number(m.paid) > 0).map((m) => m.month).sort().reverse(),
    [availableMonthsList]
  );
  const paidKey = paidMonths.join(',');
  const listOf = (res) => (Array.isArray(res.data) ? res.data : res.data.results || []);

  useEffect(() => {
    if (!isHistory) return undefined;
    let cancelled = false;
    (async () => {
      setHistLoading(true);
      try {
        if (histFilter === 'unpaid') {
          const res = await api.get('/contributions/?status=unpaid');
          if (!cancelled) { setHistData(listOf(res)); setPaidNext(0); }
        } else if (histMonth) {
          const res = await api.get('/contributions/?status=paid&month=' + histMonth);
          if (!cancelled) { setHistData(listOf(res)); setPaidNext(paidMonths.length); }
        } else if (paidMonths.length === 0) {
          if (!cancelled) { setHistData([]); setPaidNext(0); }
        } else {
          const res = await api.get('/contributions/?status=paid&month=' + paidMonths[0]);
          if (!cancelled) { setHistData(listOf(res)); setPaidNext(1); }
        }
      } catch (error) {
        console.error('Error fetching history:', error?.response?.data || error.message);
      }
      if (!cancelled) setHistLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isHistory, histFilter, histMonth, paidKey, histVersion]);

  const loadMorePaid = useCallback(async () => {
    if (histFilter !== 'paid' || histLoading || moreBusy.current || paidNext >= paidMonths.length) return;
    moreBusy.current = true;
    setHistMore(true);
    try {
      const res = await api.get('/contributions/?status=paid&month=' + paidMonths[paidNext]);
      setHistData((prev) => [...prev, ...listOf(res)]);
      setPaidNext((n) => n + 1);
    } catch (error) {
      console.error('Error loading more:', error?.response?.data || error.message);
    }
    moreBusy.current = false;
    setHistMore(false);
  }, [histFilter, histLoading, paidNext, paidKey]);

  // The Members screen header "Add" opens Generate month on this tab.
  useEffect(() => {
    if (!addRef) return undefined;
    addRef.current = isAdmin && embedded && view === 'contributions' ? () => setShowGenerateModal(true) : null;
    return () => { addRef.current = null; };
  }, [addRef, isAdmin, embedded, view]);

  // The Members screen calls this when the user scrolls near the bottom.
  useEffect(() => {
    if (!endRef) return undefined;
    endRef.current = isHistory ? loadMorePaid : null;
    return () => { endRef.current = null; };
  }, [endRef, isHistory, loadMorePaid]);
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
      'Create ₹' + generateAmount + ' contribution for all active members for ' + displayName + '?',
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
                  return name + ' owes ₹' + Number(carried[id]).toFixed(2)
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
      'Delete ALL contributions (paid + unpaid) for ' + formatMonth(month) + '? This cannot be undone.',
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
    setEditAmount(String(Number(contrib.amount) || 1000));
    setShowEditModal(true);
  };

  const closeEdit = () => { setShowEditModal(false); setEditingContribution(null); };
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

  const handleSettle = () => setShowSettle(true);

  const handleSelectBuyer = async (memberIdToSet) => {
    const result = await setBuyingMember(poolMonth, memberIdToSet);

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
    if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
    return '₹' + num.toFixed(0);
  };

  // The abbreviated formatter above is for headline totals; settlement figures
  // are small and must be exact, or "₹0.8K" hides an ₹810 obligation.
  const formatExact = (amount) =>
    '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatBuyerAdvance = (amount) => '₹' + Math.trunc(Number(amount) || 0).toLocaleString('en-IN');

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
      notes.push(fmtFull(base) + ' - ' + fmtFull(advance) + ' advance repaid');
    }
    // Settlement never sets this any more - unspent money stays in the pool -
    // so it only appears when an admin has added a one-off charge by hand.
    if (carry > 0) {
      notes.push('+ ' + fmtFull(carry) + ' extra charge');
    }
    if (Number(contrib.additional_payment) > 0) {
      notes.push(fmtFull(contrib.additional_payment) + ' paid above the scheduled installment');
    }
    if (topup > 0) {
      notes.push('Bought this month, paid ' + fmtFull(Math.trunc(topup)) + ' extra');
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

  const visibleContributions = isHistory ? histData : contributions;
  const groupedContributions = visibleContributions.reduce((groups, contrib) => {
    const month = contrib.month || 'Unknown';
    if (!groups[month]) groups[month] = [];
    groups[month].push(contrib);
    return groups;
  }, {});

  const sortedMonths = Object.keys(groupedContributions).sort((a, b) => b.localeCompare(a));

  // Sections, so the screen can show them all at once or split into tabs.
  const summarySection = (
    <>
        {summary && (
          <SummaryCard
            label={`${summary.current_month} · Collected`}
            value={formatCurrency(summary.current_month_collected)}
            rows={[
              { label: 'Paid', value: `${summary.paid_count}/${summary.total_members}`, color: COLORS.profit },
              { label: 'Pending', value: String(summary.unpaid_count), color: Number(summary.unpaid_count) > 0 ? COLORS.loss : undefined },
              { label: 'Total collected (all time)', value: formatCurrency(summary.total_collected_all_time) },
            ]}
          />
        )}

    </>
  );

  const filterMonthLabel = selectedMonth
    ? (availableMonthsList.find((m) => m.month === selectedMonth)?.month_name || formatMonth(selectedMonth))
    : 'All months';

  const chipsSection = (
    <>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Month</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => setShowMonthFilter(true)}>
            <Text style={styles.monthButtonText} numberOfLines={1}>{filterMonthLabel}</Text>
            <ArrowDown2 size={12} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity style={styles.moreButton} onPress={() => setShowTools(true)} accessibilityLabel="More actions">
              <More size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
    </>
  );

  const toolsSection = (
    <>
        {isAdmin && (poolStatus?.unsettled_months?.length > 0) && (
          <View style={styles.unsettledBanner}>
            <Text style={styles.unsettledTitle}>
              {poolStatus.unsettled_months.length} month
              {poolStatus.unsettled_months.length > 1 ? 's need' : ' needs'} settling
            </Text>
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
          <FormCard style={styles.poolCard}>
            <View style={styles.poolHeader}>
              <View style={styles.poolTitleBlock}>
                <Text style={styles.poolTitle}>Monthly Cash</Text>
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
                  {poolStatus?.is_settled ? 'Settled' : 'Open'}
                </Text>
              )}
            </View>

            {/* The pool is one pot of money. Showing only "collected vs spent"
                is what made a buyer look out of pocket for cash the pool
                already had, so every source is listed. */}
            <View>
              {Number(poolStatus?.opening_cash) > 0 && (
                <PreviewRow label="Carried over" value={formatExact(poolStatus.opening_cash)} />
              )}
              <PreviewRow label="Contributions" value={formatExact(poolStatus?.base_collected)} />
              {usableSales > 0 && (
                <PreviewRow label="Share sales" value={formatExact(usableSales)} color={COLORS.profit} />
              )}
              <PreviewTotal>
                <PreviewRow label="Pool cash available" value={formatExact(poolStatus?.available_cash)} strong />
              </PreviewTotal>
              <PreviewRow label="Spent on shares" value={`-${formatExact(poolStatus?.total_invested)}`} />
              {/* Below the line on purpose: this money landed after the order
                  was placed, so it could not have paid for it. */}
              {lateSales > 0 && (
                <PreviewRow label="Share sales, after the buy" value={formatExact(lateSales)} color={COLORS.profit} />
              )}
              <PreviewTotal>
                <PreviewRow label="Left in pool" value={formatExact(poolStatus?.closing_cash)} strong />
              </PreviewTotal>
            </View>

            {/* The gap, said in plain words rather than as a signed number. */}
            {Number(poolStatus?.overspend) > 0 && (
              <View style={[styles.poolNote, styles.poolNoteWarn]}>
                <Text style={styles.poolNoteText}>
                  {poolStatus.buying_member_name || 'Buyer'} paid{' '}
                  {formatBuyerAdvance(poolStatus.overspend)} extra from their own pocket.
                </Text>
                <Text style={styles.poolNoteSub}>
                  The monthly buyer advance counts whole rupees only.
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
                  <AppIcon
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

            <View style={styles.buyerPick}>
              <BuyerPicker
                label="Buying member"
                members={members}
                value={poolStatus?.buying_member}
                onChange={(id) => handleSelectBuyer(Number(id))}
              />
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

            <PremiumButton
              title={settling ? 'Settling...' : poolStatus?.is_settled ? 'Re-settle month' : 'Settle month'}
              onPress={handleSettle}
              loading={settling}
              disabled={!poolStatus?.buying_member || settling}
              icon="✅"
              style={{ marginTop: SPACING.lg }}
            />
          </FormCard>
        )}

        {/* Inside the Members screen, Generate month is the header Add button. */}
        {isAdmin && !embedded && (
          <PremiumButton
            title={generating ? 'Generating...' : 'Generate month'}
            onPress={() => setShowGenerateModal(true)}
            loading={generating}
            icon="➕"
            style={{ marginTop: SPACING.lg }}
          />
        )}
    </>
  );

  // Same look as the Dividends list: a band per month, then plain rows with dividers.
  const bandBleed = embedded ? SPACING.lg : SPACING.md;
  // Paid tab only: a button that opens a month picker.
  const histMonthLabel = histMonth
    ? (availableMonthsList.find((m) => m.month === histMonth)?.month_name || formatMonth(histMonth))
    : 'All months';
  const paidMonthKeys = availableMonthsList.filter((m) => Number(m.paid) > 0).map((m) => m.month);
  const monthPicker = histFilter === 'paid' && (
    <TouchableOpacity style={styles.monthButton} onPress={() => setShowMonthPicker(true)}>
      <Text style={styles.monthButtonText} numberOfLines={1}>{histMonthLabel}</Text>
      <ArrowDown2 size={12} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const statusTabs = (
    <View style={styles.statusTabs}>
      <View style={styles.statusChips}>
      {[['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([key, label]) => {
        const active = histFilter === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.monthChip, active && styles.monthChipActive]}
            onPress={() => setHistFilter(key)}
          >
            <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
      </View>
      {monthPicker}
    </View>
  );

  const historySection = (
    <>
      {sortedMonths.length === 0 ? (
        <FormCard style={styles.emptyCard}>
          <AppIcon name="document-text-outline" size={48} color="#555" />
          <Text style={styles.emptyText}>{isHistory ? `No ${histFilter} contributions` : 'No contributions found'}</Text>
          {isAdmin && <Text style={styles.emptySubtext}>Tap "Generate Month" to create entries</Text>}
        </FormCard>
      ) : (
        sortedMonths.map((month) => {
          const rows = groupedContributions[month];
          return (
            <View key={month}>
              <View style={[styles.band, { marginHorizontal: -bandBleed, paddingHorizontal: bandBleed }]}>
                <Text style={styles.bandText}>{formatMonth(month)}</Text>
                <Text style={styles.bandTotal}>
                  {isHistory
                    ? `${rows.length} ${histFilter}`
                    : `${rows.filter((c) => c.status === 'paid').length}/${rows.length} paid`}
                </Text>
              </View>
              {rows.map((contrib, i) => {
                const paid = contrib.status === 'paid';
                const person = members.find((m) => m.id === contrib.member) || { name: contrib.member_name };
                // The Paid / Unpaid chips already say the status, so only the paid date shows.
                const sub = paid && contrib.paid_date
                  ? 'Paid on ' + new Date(contrib.paid_date).toLocaleDateString('en-IN')
                  : null;
                return (
                  <View key={contrib.id} style={[styles.hRow, i > 0 && styles.hRowDivider]}>
                    <UserAvatar person={person} size={40} style={{ marginRight: SPACING.md }} />
                    <View style={styles.hLeft}>
                      <View style={styles.hNameRow}>
                        <Text style={styles.hName} numberOfLines={1}>{contrib.member_name || 'Member'}</Text>
                        {(parseFloat(contrib.buyer_topup) || 0) > 0 && <Text style={styles.hBuyer}>Buyer</Text>}
                      </View>
                      {!!sub && <Text style={styles.hSub}>{sub}</Text>}
                      {/* payable_amount is the cash actually handed over; it
                          differs from `amount` whenever pool cash is being
                          returned, which is not new capital. */}
                      {adjustmentNotes(contrib).map((note) => (
                        <Text key={note} style={styles.adjustmentNote}>{note}</Text>
                      ))}
                    </View>
                    <View style={styles.hRight}>
                      <Text style={styles.hAmount}>{fmtFull(contrib.payable_amount ?? contrib.amount)}</Text>
                    </View>
                    {isAdmin && (
                      <View style={styles.hActions}>
                        <TouchableOpacity style={[styles.hAction, isAdjusted(contrib) && styles.hActionWarn]} onPress={() => openEditModal(contrib)}>
                          <AppIcon
                            name="pencil-outline"
                            size={16}
                            color={isAdjusted(contrib) ? COLORS.warning : COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.hAction, paid ? styles.hActionDanger : styles.hActionOk]}
                          onPress={() => (paid ? handleMarkUnpaid(contrib.id) : handleMarkPaid(contrib.id))}
                        >
                          <AppIcon
                            name={paid ? 'close-circle-outline' : 'checkmark-circle-outline'}
                            size={18}
                            color={paid ? COLORS.loss : COLORS.profit}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </>
  );

  const closeTools = () => setShowTools(false);
  const settleIncludes = [
    Number(poolStatus?.opening_cash) > 0 && formatExact(poolStatus.opening_cash) + ' carried over',
    usableSales > 0 && formatExact(usableSales) + ' from share sales',
  ].filter(Boolean).join(', ');
  const modals = (
    <>
      <DialogCard
        visible={showSettle}
        title={`Settle ${formatMonth(poolMonth)}`}
        onDismiss={() => setShowSettle(false)}
        buttons={[
          { text: 'Cancel', color: COLORS.accent, onPress: () => setShowSettle(false) },
          { text: 'Settle', color: COLORS.accent, onPress: () => { setShowSettle(false); runSettle(false); } },
        ]}
      >
        <View style={styles.settleRows}>
          <PreviewRow
            label="Pool cash available"
            sub={settleIncludes ? 'Includes ' + settleIncludes : undefined}
            value={formatExact(poolStatus?.available_cash)}
          />
          <PreviewRow label="Spent on shares" value={`-${formatExact(poolStatus?.total_invested)}`} />
          <PreviewTotal>
            <PreviewRow
              label="Buyer advance"
              sub={Number(poolStatus?.overspend) > 0
                ? `Credited to ${poolStatus.buying_member_name || 'the buyer'} toward upcoming installments`
                : undefined}
              value={formatBuyerAdvance(poolStatus?.overspend)}
            />
            <PreviewRow label="Stays in the pool" value={formatExact(poolStatus?.closing_cash)} strong />
          </PreviewTotal>
          {lateSales > 0 && (
            <Text style={styles.settleNote}>
              {formatExact(lateSales)} sold after the buy is kept for next month.
            </Text>
          )}
        </View>
      </DialogCard>
      <DialogCard
        visible={showTools}
        title="More actions"
        onDismiss={closeTools}
      >
        <View style={styles.toolList}>
          {[
            { key: 'cleanup', Icon: Eraser, label: 'Clean up unpaid', hint: 'Remove unpaid entries of earlier months', danger: true, disabled: cleaning, onPress: handleCleanupContributions },
            !!selectedMonth && { key: 'delete', Icon: CalendarRemove, label: `Delete ${formatMonth(selectedMonth)}`, hint: 'Remove every entry of this month', danger: true, onPress: () => handleDeleteMonth(selectedMonth) },
            { key: 'sync', Icon: Refresh2, label: 'Rebuild pool totals', hint: 'Recalculate the monthly pool cash', disabled: syncing, onPress: handleSyncPools },
          ].filter(Boolean).map(({ key, Icon, label, hint, danger, disabled, onPress }, i) => (
            <TouchableOpacity
              key={key}
              style={[styles.toolRow, i > 0 && styles.toolRowDivider]}
              disabled={disabled}
              onPress={() => { closeTools(); onPress(); }}
            >
              <View style={[styles.toolIcon, danger && styles.toolIconDanger]}>
                <Icon size={18} color={danger ? COLORS.loss : COLORS.accent} />
              </View>
              <View style={styles.toolText}>
                <Text style={[styles.toolRowText, danger && { color: COLORS.loss }]}>{label}</Text>
                <Text style={styles.toolHint}>{hint}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </DialogCard>
      <MonthPickerDialog
        visible={showMonthFilter}
        value={selectedMonth}
        enabledMonths={availableMonthsList.map((m) => m.month)}
        onSelect={setSelectedMonth}
        onClose={() => setShowMonthFilter(false)}
      />
      <DialogCard
        visible={showGenerateModal}
        title="Generate month"
        message="Create entries for all active members"
        onDismiss={() => setShowGenerateModal(false)}
        buttons={[
          { text: 'Cancel', color: COLORS.accent, onPress: () => setShowGenerateModal(false) },
          { text: 'Generate', color: COLORS.accent, onPress: handleGenerateContributions },
        ]}
      >
        <View style={styles.yearSelector}>
          <TouchableOpacity style={styles.yearButton} onPress={() => setGenerateYear(String(parseInt(generateYear) - 1))}>
            <ArrowLeft2 size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.yearText}>{generateYear}</Text>
          <TouchableOpacity style={styles.yearButton} onPress={() => setGenerateYear(String(parseInt(generateYear) + 1))}>
            <ArrowRight2 size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.monthGrid}>
          {MONTH_NAMES.map((m, index) => (
            <TouchableOpacity key={m} style={[styles.monthGridItem, generateMonthIndex === index && styles.monthGridItemActive]} onPress={() => setGenerateMonthIndex(index)}>
              <Text style={[styles.monthGridText, generateMonthIndex === index && styles.monthGridTextActive]}>{m.substring(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <PremiumInput
          label="Amount per member (₹)"
          value={generateAmount}
          onChangeText={setGenerateAmount}
          keyboardType="numeric"
          placeholder="1000"
          icon="💵"
          style={styles.editInput}
        />
      </DialogCard>

      <DialogCard
        visible={showEditModal}
        title="Edit amount"
        onDismiss={closeEdit}
        buttons={[
          { text: 'Cancel', color: COLORS.accent, onPress: closeEdit },
          { text: 'Update', color: COLORS.accent, onPress: handleUpdateAmount },
        ]}
      >
        {!!editingContribution && (
          <View style={styles.editWho}>
            <UserAvatar
              person={members.find((m) => m.id === editingContribution.member) || { name: editingContribution.member_name }}
              size={40}
              style={{ marginRight: SPACING.md }}
            />
            <View style={styles.editWhoText}>
              <Text style={styles.editWhoName} numberOfLines={1}>{editingContribution.member_name || 'Member'}</Text>
              <Text style={styles.editWhoSub}>{editingContribution.month ? formatMonth(editingContribution.month) : ''}</Text>
            </View>
          </View>
        )}
        {!!editingContribution && isAdjusted(editingContribution) && (
          <View style={styles.editWarning}>
            <Text style={styles.editWarningTitle}>Set by the settlement</Text>
            <Text style={styles.editWarningText}>
              This amount is an advance repayment or a buyer top-up. If you edit it by hand,
              the next settlement of this month will overwrite it, and the member can be charged twice.
            </Text>
          </View>
        )}
        <PremiumInput
          label="Amount (₹)"
          value={editAmount}
          onChangeText={setEditAmount}
          keyboardType="numeric"
          placeholder="1000"
          icon="💵"
          autoFocus
          style={styles.editInput}
        />
      </DialogCard>
    </>
  );

  if (loading) {
    if (embedded) {
      return (
        <View style={styles.embeddedLoading}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader
          title={memberName ? memberName + "'s Contributions" : 'Contributions'}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </View>
    );
  }

  // Inside the Members screen: no header or scroll of its own, one tab at a time.
  if (embedded) {
    return (
      <>
        {view === 'history' ? (
          <>
            {statusTabs}
            {historySection}
            {(histLoading || histMore) && <ActivityIndicator style={styles.histSpinner} color={COLORS.accent} />}
          </>
        ) : (
          <>{summarySection}{chipsSection}{toolsSection}</>
        )}
        {modals}
        <MonthPickerDialog
          visible={showMonthPicker}
          value={histMonth}
          enabledMonths={paidMonthKeys}
          onSelect={setHistMonth}
          onClose={() => setShowMonthPicker(false)}
        />
      </>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={memberName ? memberName + "'s Contributions" : 'Contributions'}
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
      >
        {summarySection}
        {chipsSection}
        {toolsSection}
        {historySection}
        <TabBarSpacer />
      </ScrollView>

      {modals}
    </View>
  );
};

export default ContributionsScreen;

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1, paddingHorizontal: SPACING.md },
  embeddedLoading: { paddingVertical: SPACING.xxxl, alignItems: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterLabel: { ...TYPE.secondaryMedium, color: COLORS.textSecondary, flex: 1 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardBg, marginRight: 8, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthChipText: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  monthChipTextActive: { color: COLORS.onAccent },
  histSpinner: { paddingVertical: SPACING.lg },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  moreButton: { width: 32, height: 32, borderRadius: 16, marginLeft: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border },
  settleRows: { marginTop: SPACING.lg },
  settleNote: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: SPACING.sm, lineHeight: 14 },
  toolList: { marginTop: SPACING.md },
  toolRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  toolIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent + '14', marginRight: SPACING.md },
  toolIconDanger: { backgroundColor: COLORS.loss + '14' },
  toolText: { flex: 1, minWidth: 0 },
  toolHint: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  toolRowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  toolRowText: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  buyerPick: { marginTop: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: SPACING.lg },
  statusTabs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  statusChips: { flexDirection: 'row' },
  monthButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, maxWidth: 140,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.border,
  },
  monthButtonText: { ...TYPE.caption, fontWeight: '500', color: COLORS.textSecondary, flexShrink: 1 },
  band: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md,
    backgroundColor: COLORS.isDark ? COLORS.surface : COLORS.surfaceLight, paddingVertical: SPACING.md,
  },
  bandText: { ...TYPE.secondaryMedium, color: COLORS.textSecondary },
  bandTotal: { ...TYPE.caption, color: COLORS.textMuted },
  hRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  hRowDivider: { borderTopWidth: 1, borderTopColor: COLORS.divider },
  hLeft: { flex: 1, minWidth: 0, marginRight: SPACING.md },
  hRight: { alignItems: 'flex-end' },
  hNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  hBuyer: {
    ...TYPE.captionMedium, fontSize: 10, color: COLORS.accent, backgroundColor: COLORS.accent + '14',
    paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, overflow: 'hidden',
  },
  hName: { flexShrink: 1, ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  hAmount: { ...TYPE.smallValue, fontSize: 12, color: COLORS.textPrimary },
  hSub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  hActions: { flexDirection: 'row', gap: SPACING.xs, marginLeft: SPACING.md },
  hAction: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.textMuted + '1F' },
  hActionWarn: { backgroundColor: COLORS.warning + '1F' },
  hActionOk: { backgroundColor: COLORS.profit + '1F' },
  hActionDanger: { backgroundColor: COLORS.loss + '1F' },
  // flex + minWidth keep the name/amount block inside the card. Without them
  // it sizes to its content and shoves the badge and buttons off the screen.
  // Stacked, and never shrunk: on a narrow phone a badge beside two buttons
  // does not fit next to a member name, and the controls are what get cut.
  // 40pt so the paid/unpaid toggle is a comfortable tap target, not an icon.
  emptyCard: { marginTop: SPACING.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { ...TYPE.cardTitle, color: COLORS.textSecondary },
  emptySubtext: { ...TYPE.secondary, color: COLORS.textMuted, textAlign: 'center' },
  // Pool settlement
  unsettledBanner: { marginTop: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.loss + '14' },
  unsettledTitle: { ...TYPE.cardTitle, fontSize: 12, color: COLORS.loss },
  unsettledChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm },
  unsettledChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.loss + '1F' },
  unsettledChipText: { ...TYPE.captionMedium, color: COLORS.loss },
  unsettledHint: { ...TYPE.caption, fontSize: 10, color: COLORS.textSecondary, marginTop: SPACING.sm },
  poolCard: { marginTop: SPACING.md, padding: SPACING.lg },
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: SPACING.md, marginBottom: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  poolTitleBlock: { flex: 1, minWidth: 0 },
  poolTitle: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  poolMonthText: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  settledBadge: { ...TYPE.captionMedium, fontSize: 10, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full, overflow: 'hidden' },
  settledBadgePaid: { color: COLORS.profit, backgroundColor: COLORS.profit + '1F' },
  settledBadgeOpen: { color: COLORS.warning, backgroundColor: COLORS.warning + '1F' },
  handover: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider },
  handoverHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  handoverTitleBlock: { flex: 1, minWidth: 0 },
  handoverTitle: { ...TYPE.cardTitle, fontSize: 12, color: COLORS.textPrimary },
  handoverSubtitle: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 14 },
  handoverList: { marginTop: SPACING.sm, gap: 2 },
  handoverRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.sm, paddingVertical: 8 },
  handoverWho: { flex: 1, minWidth: 0 },
  handoverName: { ...TYPE.cardTitle, fontSize: 12, color: COLORS.textPrimary },
  handoverBreakdown: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 14 },
  handoverUnpaid: { ...TYPE.captionMedium, fontSize: 10, color: COLORS.loss, marginTop: 4 },
  handoverAmount: { ...TYPE.secondary, fontSize: 12, color: COLORS.textSecondary },
  handoverNote: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: SPACING.sm, lineHeight: 14 },
  poolNote: { marginTop: SPACING.lg, padding: SPACING.md, borderRadius: RADIUS.md },
  poolNoteWarn: { backgroundColor: COLORS.warning + '14' },
  poolNoteInfo: { backgroundColor: COLORS.accent + '14' },
  poolNoteText: { ...TYPE.cardTitle, fontSize: 12, color: COLORS.textPrimary, lineHeight: 18 },
  poolNoteSub: { ...TYPE.caption, fontSize: 10, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },
  poolWarning: { ...TYPE.captionMedium, fontSize: 10, color: COLORS.warning, marginTop: SPACING.md },
  adjustmentNote: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4, lineHeight: 14 },
  editWho: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg },
  editWhoText: { flex: 1, minWidth: 0 },
  editWhoName: { ...TYPE.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  editWhoSub: { ...TYPE.caption, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  editWarning: { borderRadius: RADIUS.md, backgroundColor: COLORS.warning + '14', padding: SPACING.md, marginTop: SPACING.lg },
  editWarningTitle: { ...TYPE.cardTitle, fontSize: 12, color: COLORS.warning },
  editWarningText: { ...TYPE.caption, fontSize: 10, color: COLORS.textSecondary, lineHeight: 16, marginTop: 4 },
  editInput: { marginTop: SPACING.lg, marginBottom: 0 },

  yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.lg, marginBottom: SPACING.md },
  yearButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent + '14', justifyContent: 'center', alignItems: 'center' },
  yearText: { ...TYPE.cardTitle, fontSize: 16, color: COLORS.textPrimary },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  monthGridItem: { width: '23%', flexGrow: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.inputBg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.inputBorder },
  monthGridItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthGridText: { ...TYPE.secondaryMedium, color: COLORS.textPrimary },
  monthGridTextActive: { color: COLORS.onAccent },
}));
