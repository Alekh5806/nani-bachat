/**
 * Premium Button Component
 * Gradient or glass styled button with press animations
 */
import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, FONTS } from '../theme/colors';

export const PremiumButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary', // primary, secondary, danger, outline
  icon,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const isDisabled = disabled || loading;

  const getGradientColors = () => {
    switch (variant) {
      case 'primary': return [COLORS.gradientStart, COLORS.gradientEnd];
      case 'danger': return [COLORS.loss, '#DC2626'];
      case 'secondary': return [COLORS.surface, COLORS.surfaceLight];
      case 'outline': return ['transparent', 'transparent'];
      default: return [COLORS.gradientStart, COLORS.gradientEnd];
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={isDisabled ? [COLORS.buttonDisabled, COLORS.buttonDisabled] : getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.button,
          variant === 'outline' && styles.outlineButton,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            {icon && <Text style={styles.icon}>{icon}</Text>}
            <Text
              style={[
                styles.text,
                variant === 'outline' && styles.outlineText,
                isDisabled && styles.disabledText,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.md,
    minHeight: 52,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  text: {
    color: '#FFFFFF',
    fontSize: FONTS.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  outlineText: {
    color: COLORS.accent,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
});
