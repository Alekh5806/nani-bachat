import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../config/api';
import { GlassCard } from '../components/GlassCard';
import { PremiumButton } from '../components/PremiumButton';
import { PremiumInput } from '../components/PremiumInput';
import { ScreenHeader } from '../components/ScreenHeader';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme/colors';

const AVATAR_COLORS = ['#00D09C', '#4F46E5', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const AddMemberScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    avatar_color: AVATAR_COLORS[0],
    catchUpMonths: '4',
    monthlyAmount: '1000',
    paymentMonth: getCurrentMonth(),
  });
  const [recordCatchUp, setRecordCatchUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const catchUpAmount = useMemo(() => {
    const months = Number(form.catchUpMonths) || 0;
    const amount = Number(form.monthlyAmount) || 0;
    return months * amount;
  }, [form.catchUpMonths, form.monthlyAmount]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.phone.trim()) return 'Phone number is required';
    if (form.password.length < 6) return 'Password must be at least 6 characters';
    if (recordCatchUp && catchUpAmount <= 0) return 'Catch-up amount must be greater than zero';
    if (recordCatchUp && !/^\d{4}-\d{2}$/.test(form.paymentMonth.trim())) {
      return 'Payment month must be in YYYY-MM format';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Toast.show({ type: 'error', text1: validationError });
      return;
    }

    setSubmitting(true);
    let createdMember = null;

    try {
      const memberResponse = await api.post('/auth/register/', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        password: form.password,
        role: 'member',
        avatar_color: form.avatar_color,
      });
      createdMember = memberResponse.data;

      if (recordCatchUp) {
        await api.post('/contributions/', {
          member: createdMember.id,
          month: form.paymentMonth.trim(),
          amount: catchUpAmount,
          status: 'paid',
          paid_date: getToday(),
          notes: `Joining catch-up payment for ${form.catchUpMonths || 0} month(s)`,
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Member added',
        text2: recordCatchUp ? `Recorded Rs.${catchUpAmount.toLocaleString('en-IN')} payment` : undefined,
      });
      navigation.goBack();
    } catch (error) {
      const data = error.response?.data;
      const message = data?.phone?.[0]
        || data?.email?.[0]
        || data?.detail
        || data?.error
        || 'Could not add member';

      if (createdMember && recordCatchUp) {
        Alert.alert(
          'Member added, payment pending',
          `${createdMember.name} was created, but the catch-up payment was not recorded. You can add it from Contributions.`
        );
        navigation.goBack();
      } else {
        Toast.show({ type: 'error', text1: 'Add member failed', text2: String(message) });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Add Member"
        subtitle="Create account and optional catch-up payment"
        showBack
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>Member Details</Text>
            <PremiumInput
              label="Name"
              value={form.name}
              onChangeText={(value) => updateForm('name', value)}
              placeholder="Friend name"
              icon="👤"
              autoCapitalize="words"
            />
            <PremiumInput
              label="Phone"
              value={form.phone}
              onChangeText={(value) => updateForm('phone', value)}
              placeholder="9876543210"
              keyboardType="phone-pad"
              icon="📱"
            />
            <PremiumInput
              label="Email (Optional)"
              value={form.email}
              onChangeText={(value) => updateForm('email', value)}
              placeholder="friend@example.com"
              keyboardType="email-address"
              icon="✉️"
            />
            <PremiumInput
              label="Temporary Password"
              value={form.password}
              onChangeText={(value) => updateForm('password', value)}
              placeholder="Minimum 6 characters"
              secureTextEntry
              icon="🔐"
            />

            <Text style={styles.label}>Avatar Color</Text>
            <View style={styles.swatchRow}>
              {AVATAR_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => updateForm('avatar_color', color)}
                  style={[
                    styles.swatchButton,
                    { backgroundColor: color },
                    form.avatar_color === color && styles.swatchButtonActive,
                  ]}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.sectionTitle}>Catch-up Payment</Text>
                <Text style={styles.helperText}>Use this when a new member pays old months now.</Text>
              </View>
              <Switch
                value={recordCatchUp}
                onValueChange={setRecordCatchUp}
                trackColor={{ false: COLORS.surfaceLight, true: COLORS.accent + '80' }}
                thumbColor={recordCatchUp ? COLORS.accent : COLORS.textMuted}
              />
            </View>

            {recordCatchUp && (
              <>
                <View style={styles.amountRow}>
                  <View style={styles.amountInput}>
                    <PremiumInput
                      label="Past Months"
                      value={form.catchUpMonths}
                      onChangeText={(value) => updateForm('catchUpMonths', value)}
                      keyboardType="numeric"
                      placeholder="4"
                    />
                  </View>
                  <View style={styles.amountInput}>
                    <PremiumInput
                      label="Monthly Amount"
                      value={form.monthlyAmount}
                      onChangeText={(value) => updateForm('monthlyAmount', value)}
                      keyboardType="numeric"
                      placeholder="1000"
                    />
                  </View>
                </View>
                <PremiumInput
                  label="Payment Month"
                  value={form.paymentMonth}
                  onChangeText={(value) => updateForm('paymentMonth', value)}
                  placeholder="YYYY-MM"
                  keyboardType="numbers-and-punctuation"
                />
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Amount to record as paid</Text>
                  <Text style={styles.totalAmount}>Rs.{catchUpAmount.toLocaleString('en-IN')}</Text>
                </View>
              </>
            )}
          </GlassCard>

          <PremiumButton
            title={submitting ? 'Adding Member...' : 'Add Member'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            icon="➕"
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AddMemberScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 120,
  },
  card: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.lg,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  swatchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  swatchButtonActive: {
    borderWidth: 3,
    borderColor: COLORS.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  toggleTextWrap: {
    flex: 1,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
  },
  amountRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  amountInput: {
    flex: 1,
  },
  totalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  totalLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  totalAmount: {
    color: COLORS.accent,
    fontSize: FONTS.xxl,
    fontWeight: '900',
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
});
