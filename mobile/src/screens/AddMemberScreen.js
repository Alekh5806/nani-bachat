import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Alert } from '../utils/alert';
import api from '../config/api';
import { FormScreen, FormLabel } from '../components/FormScreen';
import { SwitchRow } from '../components/SwitchRow';
import { PreviewCard, PreviewRow, PreviewTotal } from '../components/PreviewCard';
import { fmtFull } from '../utils/currency';
import { AvatarSelect } from '../components/AvatarSelect';
import { PremiumButton } from '../components/PremiumButton';
import { PremiumInput } from '../components/PremiumInput';
import { COLORS, FONTS, RADIUS, SPACING, themedStyles, TYPE } from '../theme/colors';

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
    avatar: '',
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

  // The field that failed the last submit gets a red border until it is edited.
  const [errors, setErrors] = useState({});
  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Returns { field, message } for the first problem, or null.
  const validate = () => {
    if (!form.name.trim()) return { field: 'name', message: 'Name is required' };
    if (!form.phone.trim()) return { field: 'phone', message: 'Phone number is required' };
    if (form.password.length < 6) return { field: 'password', message: 'Password must be at least 6 characters' };
    if (recordCatchUp && catchUpAmount <= 0) return { field: 'monthlyAmount', message: 'Catch-up amount must be greater than zero' };
    if (recordCatchUp && !/^\d{4}-\d{2}$/.test(form.paymentMonth.trim())) {
      return { field: 'paymentMonth', message: 'Payment month must be in YYYY-MM format' };
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      setErrors({ [problem.field]: problem.message });
      Toast.show({ type: 'error', text1: problem.message });
      return;
    }
    setErrors({});

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
        avatar: form.avatar,
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
        text2: recordCatchUp ? `Recorded ₹${catchUpAmount.toLocaleString('en-IN')} payment` : undefined,
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
    <FormScreen
      title="Add Member"
      subtitle="Create account and optional catch-up payment"
      onBack={() => navigation.goBack()}
    >
      <FormLabel>Member details</FormLabel>
      <View style={styles.card}>
        <PremiumInput
          label="Name"
          error={errors.name}
          value={form.name}
          onChangeText={(value) => updateForm('name', value)}
          placeholder="Friend name"
          icon="👤"
          autoCapitalize="words"
        />
        <PremiumInput
          label="Phone"
          error={errors.phone}
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
          error={errors.password}
          value={form.password}
          onChangeText={(value) => updateForm('password', value)}
          placeholder="Minimum 6 characters"
          secureTextEntry
          icon="🔐"
        />

        <AvatarSelect value={form.avatar} onChange={(key) => updateForm('avatar', key)} />
      </View>

      <View style={styles.card}>
        <SwitchRow
          label="Catch-up payment"
          hint="Use this when a new member pays old months now"
          value={recordCatchUp}
          onValueChange={setRecordCatchUp}
        />

        {recordCatchUp && (
          <>
            <PremiumInput
              label="Past Months"
              value={form.catchUpMonths}
              onChangeText={(value) => updateForm('catchUpMonths', value)}
              keyboardType="numeric"
              placeholder="4"
            />
            <PremiumInput
              label="Monthly Amount"
              value={form.monthlyAmount}
              onChangeText={(value) => updateForm('monthlyAmount', value)}
              keyboardType="numeric"
              placeholder="1000"
            />
            <PremiumInput
              label="Payment Month"
              error={errors.paymentMonth}
              value={form.paymentMonth}
              onChangeText={(value) => updateForm('paymentMonth', value)}
              placeholder="YYYY-MM"
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}
      </View>

      {recordCatchUp && (
        <PreviewCard title="Catch-up preview" style={styles.card}>
          <PreviewRow label="Past months" value={String(Number(form.catchUpMonths) || 0)} />
          <PreviewRow label="Monthly amount" value={fmtFull(form.monthlyAmount)} />
          <PreviewRow label="Payment month" value={form.paymentMonth || '—'} />
          <PreviewTotal>
            <PreviewRow label="Amount to record as paid" value={fmtFull(catchUpAmount)} strong />
          </PreviewTotal>
        </PreviewCard>
      )}

      <PremiumButton
        title={submitting ? 'Adding Member...' : 'Add Member'}
        onPress={handleSubmit}
        loading={submitting}
        disabled={submitting}
        icon="➕"
        style={styles.submitButton}
      />
    </FormScreen>
  );
};

export default AddMemberScreen;

const styles = themedStyles(() => ({
  card: {
    marginBottom: SPACING.lg,
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
}));
