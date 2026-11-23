/**
 * Custom Toast Configuration
 * Premium styled toast messages
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../components/Icon';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

const ToastBase = ({ text1, text2, bgColor, borderColor, icon }) => (
  <View style={[styles.container, { backgroundColor: bgColor, borderLeftColor: borderColor }]}>
    <Icon name={icon} size={20} color={borderColor} style={styles.icon} />
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

const styles = themedStyles(() => ({
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
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPE.cardTitle,
    color: COLORS.textPrimary,
  },
  message: {
    ...TYPE.secondary,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
}));
