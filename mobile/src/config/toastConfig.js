/**
 * Custom Toast Configuration
 * Premium styled toast messages
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../theme/colors';

const ToastBase = ({ text1, text2, bgColor, borderColor, icon }) => (
  <View style={[styles.container, { backgroundColor: bgColor, borderLeftColor: borderColor }]}>
    <Text style={styles.icon}>{icon}</Text>
    <View style={styles.textContainer}>
      {text1 && <Text style={styles.title}>{text1}</Text>}
      {text2 && <Text style={styles.message}>{text2}</Text>}
    </View>
  </View>
);

export const toastConfig = {
  success: (props) => (
    <ToastBase {...props} bgColor={COLORS.profitBg} borderColor={COLORS.profit} icon="✅" />
  ),
  error: (props) => (
    <ToastBase {...props} bgColor={COLORS.lossBg} borderColor={COLORS.loss} icon="❌" />
  ),
  info: (props) => (
    <ToastBase {...props} bgColor="rgba(59,130,246,0.15)" borderColor={COLORS.accent} icon="ℹ️" />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    marginTop: SPACING.lg,
  },
  icon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sm,
    marginTop: 2,
  },
});
