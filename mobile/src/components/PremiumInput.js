/**
 * Premium Input Component
 * Styled text input with floating label effect
 */
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Platform } from 'react-native';
import { Icon } from './Icon';
import { COLORS, RADIUS, SPACING, FONTS, themedStyles, TYPE } from '../theme/colors';

export const PremiumInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  icon,
  error,
  style,
  multiline = false,
  autoCapitalize = 'none',
  autoCorrect = false,
  autoFocus = false,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, focused && styles.labelFocused]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {icon && <Icon name={icon} size={18} color={focused ? COLORS.accent : COLORS.textMuted} style={styles.icon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoFocus={autoFocus}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.multiline]}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPE.inputLabel,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  labelFocused: {
    color: COLORS.accent,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.lg,
  },
  inputContainerFocused: {
    borderColor: COLORS.inputFocus,
    backgroundColor: 'transparent',
  },
  inputContainerError: {
    borderColor: COLORS.loss,
  },
  icon: {
    marginRight: SPACING.md,
  },
  input: {
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null), // no browser focus box; the container shows focus
    flex: 1,
    color: COLORS.textPrimary,
    ...TYPE.inputText,
    paddingVertical: SPACING.lg,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    ...TYPE.caption,
    color: COLORS.loss,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
}));
