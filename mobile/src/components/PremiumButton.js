/**
 * Premium Button Component
 * Solid button. Primary is the accent with dark text, no gradient
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Icon } from './Icon';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const PremiumButton = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary', // primary, secondary, danger, outline
  icon,
  style,
  buttonStyle,
  textStyle,
  fullWidth = true,
}) => {
  const isDisabled = disabled || loading;

  const getBackground = () => {
    switch (variant) {
      case 'danger': return COLORS.loss;
      case 'secondary': return COLORS.surface;
      case 'outline': return 'transparent';
      default: return COLORS.accent;
    }
  };
  const onSolid = variant === 'primary' || variant === 'danger';

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
      <View
        style={[
          styles.button,
          { backgroundColor: isDisabled ? COLORS.buttonDisabled : getBackground() },
          variant === 'outline' && styles.outlineButton,
          buttonStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={onSolid ? COLORS.onAccent : COLORS.textPrimary} size="small" />
        ) : (
          <>
            {icon && (
              <Icon
                name={icon}
                size={18}
                color={isDisabled ? COLORS.textMuted : onSolid ? COLORS.onAccent : COLORS.textPrimary}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.text,
                !onSolid && styles.textOnDark,
                variant === 'outline' && styles.outlineText,
                isDisabled && styles.disabledText,
                textStyle,
              ]}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = themedStyles(() => ({
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
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    marginRight: SPACING.sm,
  },
  text: {
    color: COLORS.onAccent,
    ...TYPE.button,
  },
  textOnDark: {
    color: COLORS.textPrimary,
  },
  outlineText: {
    color: COLORS.accent,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
}));
