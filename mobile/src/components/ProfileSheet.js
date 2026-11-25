import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Add } from 'iconsax-react-native';

import { COLORS, SPACING, TYPE, themedStyles } from '../theme/colors';

export const ProfileSheet = ({ title, subtitle, onDismiss, expanded, children }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onDismiss}
          style={[styles.sheet, expanded && styles.expanded, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onDismiss}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Add size={22} color={COLORS.textPrimary} style={styles.closeIcon} />
            </Pressable>
          </View>
          {expanded
            ? <View style={styles.expandedContent}>{children}</View>
            : <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>}
        </View>
      </View>
    </Modal>
  );
};

const styles = themedStyles(() => ({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: COLORS.overlay },
  sheet: {
    width: '100%', maxWidth: 520, maxHeight: '90%', padding: SPACING.xl,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderBottomWidth: 0, borderColor: COLORS.border, backgroundColor: COLORS.cardBg,
  },
  expanded: { height: '86%', maxWidth: 700 },
  expandedContent: { flex: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  headerText: { flex: 1, minWidth: 0, gap: SPACING.xs },
  title: { ...TYPE.screenTitle, fontSize: 21, color: COLORS.textPrimary },
  subtitle: { ...TYPE.secondary, color: COLORS.textSecondary },
  close: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  closeIcon: { transform: [{ rotate: '45deg' }] },
  pressed: { opacity: 0.65 },
}));
