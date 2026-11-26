/**
 * FormScreen
 * The shared shell for the Add / Edit / Sell forms: header, keyboard-safe
 * scrolling body and the bottom spacer. Use FormCard for each group of fields
 * and FormLabel for the small title above a group.
 */
import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ScreenHeader } from './ScreenHeader';
import { TabBarSpacer } from './TabBarSpacer';
import { COLORS, SPACING, RADIUS, themedStyles, TYPE } from '../theme/colors';

export const FormScreen = ({ title, subtitle, onBack, children }) => (
  <View style={styles.container}>
    <ScreenHeader title={title} subtitle={subtitle} showBack onBack={onBack} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {/* Forms end with a button, not a card: add the card margin other screens have, so the bottom gap matches. */}
        <View style={styles.endGap} />
        <TabBarSpacer />
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
);

export const FormCard = ({ style, children }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const FormLabel = ({ children, style }) => (
  <Text style={[styles.label, style]}>{children}</Text>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1, minHeight: 0 },
  endGap: { height: SPACING.md },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: SPACING.xl },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  label: {
    ...TYPE.inputLabel,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
}));
