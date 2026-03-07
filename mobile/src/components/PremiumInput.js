/**
 * Premium Input Component
 * Styled text input with floating label effect
 */
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../theme/colors';

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
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
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

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelFocused: {
    color: COLORS.accent,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SPACING.lg,
  },
  inputContainerFocused: {
    borderColor: COLORS.inputFocus,
    backgroundColor: COLORS.cardBgAlt,
  },
  inputContainerError: {
    borderColor: COLORS.loss,
  },
  icon: {
    fontSize: 18,
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.md,
    paddingVertical: SPACING.lg,
    fontWeight: '500',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  error: {
    fontSize: FONTS.xs,
    color: COLORS.loss,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
