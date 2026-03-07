import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import api from '../config/api';
import { useAuthStore } from '../store/authStore';
import { COLORS, SPACING, FONTS, RADIUS } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ContributionsScreen = ({ route, navigation }) => {
  const { user } = useAuthStore();
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
      console.error('Error fetching contributions:', error);
    }
  }, [memberId, selectedMonth]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/contributions/summary/');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, []);

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const response = await api.get('/contributions/months/');
      setAvailableMonthsList(response.data);
    } catch (error) {
      console.error('Error fetching months:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchContributions(), fetchSummary(), fetchAvailableMonths()]);
    setLoading(false);
  }, [fetchContributions, fetchSummary, fetchAvailableMonths]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { fetchContributions(); }, [selectedMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchContributions(), fetchSummary(), fetchAvailableMonths()]);
    setRefreshing(false);
  }, [fetchContributions, fetchSummary, fetchAvailableMonths]);

  const handleGenerateContributions = async () => {
    const monthDate = generateYear + '-' + String(generateMonthIndex + 1).padStart(2, '0') + '-01';
    const monthName = MONTHS[generateMonthIndex] + ' ' + generateYear;
    Alert.alert(
      'Generate Contributions',
      'Create Rs.' + generateAmount + ' contribution for all active members for ' + monthName + '?',
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
              await Promise.all([fetchContributions(), fetchSummary(), fetchAvailableMonths()]);
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: error.response?.data?.error || 'Failed' });
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
            await Promise.all([fetchContributions(), fetchSummary(), fetchAvailableMonths()]);
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to cleanup' });
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
              const response = await api.post('/contributions/delete-month/', { month });
              Toast.show({ type: 'success', text1: 'Deleted', text2: response.data.message });
              setSelectedMonth(null);
              await Promise.all([fetchContributions(), fetchSummary(), fetchAvailableMonths()]);
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete' });
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
      await Promise.all([fetchContributions(), fetchSummary()]);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update' });
    }
  };

  const handleMarkUnpaid = async (id) => {
    try {
      await api.post('/contributions/' + id + '/mark_unpaid/');
      Toast.show({ type: 'success', text1: 'Marked as Unpaid' });
      await Promise.all([fetchContributions(), fetchSummary()]);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update' });
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
      await Promise.all([fetchContributions(), fetchSummary()]);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update amount' });
    }
  };

  const formatMonth = (dateStr) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    if (num >= 100000) return 'Rs.' + (num / 100000).toFixed(1) + 'L';
    if (num >= 1000) return 'Rs.' + (num / 1000).toFixed(1) + 'K';
    return 'Rs.' + num.toLocaleString('en-IN');
  };

  const groupedContributions = contributions.reduce((groups, contrib) => {
    const month = contrib.month || 'Unknown';
    if (!groups[month]) groups[month] = [];
    groups[month].push(contrib);
    return groups;
  }, {});

  const sortedMonths = Object.keys(groupedContributions).sort((a, b) => new Date(b) - new Date(a));

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
                <Text style={styles.summaryValue}>{formatCurrency(summary.current_month_collected)}</Text>
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
                      <View>
                        <Text style={styles.memberName}>{contrib.member_name || 'Member'}</Text>
                        <Text style={styles.contributionAmount}>Rs.{parseFloat(contrib.amount || 0).toLocaleString('en-IN')}</Text>
                      </View>
                    </View>
                    <View style={styles.contributionRight}>
                      <Text style={[styles.statusBadge, {
                        color: contrib.status === 'paid' ? COLORS.profit : COLORS.loss,
                        backgroundColor: contrib.status === 'paid' ? 'rgba(0,208,156,0.15)' : 'rgba(255,68,68,0.15)',
                      }]}>{contrib.status === 'paid' ? 'PAID' : 'UNPAID'}</Text>
                      {isAdmin && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity style={styles.iconButton} onPress={() => openEditModal(contrib)}>
                            <Ionicons name="pencil-outline" size={18} color={COLORS.accent} />
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
                <Ionicons name="chevron-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{generateYear}</Text>
              <TouchableOpacity style={styles.yearButton} onPress={() => setGenerateYear(String(parseInt(generateYear) + 1))}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Month</Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((m, index) => (
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
    </View>
  );
};

export default ContributionsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1, paddingHorizontal: SPACING.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { marginTop: SPACING.md, padding: SPACING.lg },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md, textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  summaryDivider: { width: 1, height: 40, backgroundColor: '#333' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: '#333' },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  monthFilterContainer: { marginTop: SPACING.md },
  filterLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  monthScroll: { flexDirection: 'row' },
  monthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E', marginRight: 8, borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  monthChipTextActive: { color: '#FFF' },
  monthChipBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  monthChipBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  adminActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  adminButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: RADIUS.md, gap: 6 },
  generateButton: { backgroundColor: COLORS.accent || '#00D09C' },
  cleanupButton: { backgroundColor: COLORS.loss || '#FF4444' },
  adminButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  deleteMonthButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.sm, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.loss },
  deleteMonthText: { fontSize: 13, color: COLORS.loss, fontWeight: '600' },
  monthSection: { marginTop: SPACING.lg },
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  monthHeader: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  monthCount: { fontSize: 12, color: COLORS.textSecondary },
  contributionCard: { marginBottom: SPACING.sm, padding: SPACING.md },
  contributionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contributionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  contributionAmount: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  contributionRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', letterSpacing: 0.5 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { padding: 4 },
  paidDate: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, marginLeft: 22 },
  emptyCard: { marginTop: SPACING.xl, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#555', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalContent: { backgroundColor: '#1E1E1E', borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#333' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.sm },
  modalInput: { backgroundColor: '#2A2A2A', borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: '#444', textAlign: 'center' },
  yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  yearButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  yearText: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthGridItem: { width: '23%', paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: '#2A2A2A', alignItems: 'center', borderWidth: 1, borderColor: '#444' },
  monthGridItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  monthGridText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  monthGridTextActive: { color: '#FFF', fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: '#2A2A2A', alignItems: 'center' },
  modalCancelText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '700' },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center' },
  modalConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
