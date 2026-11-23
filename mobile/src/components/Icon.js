/**
 * Icon
 * One icon set (Iconsax) for the whole app. Screens still pass legacy emoji
 * strings as `icon`; they are mapped here so every icon looks the same.
 * Anything not mapped (for example the rupee sign) renders as plain text.
 *
 * AppIcon takes Ionicons-style names (used by a few screens) and renders the
 * matching Iconsax icon, so the app has a single icon family.
 */
import React from 'react';
import { Text } from 'react-native';
import {
  Chart2, Setting2, DocumentText, Logout, SearchNormal1, ClipboardText, Box,
  Money, Bank, Add, People, Wallet3, Mobile, Lock1, TickCircle, CloseCircle,
  DocumentDownload, Gift, User, Sms, InfoCircle, ArrowRight, ArrowLeft, Edit2,
  Diamonds, Coin1, TrendUp, TrendDown, Refresh2, Calendar, UserAdd, Moneys,
  ArrowLeft2, ArrowRight2, ArrowUp2, ArrowDown2, Previous, Next, Danger,
  ArrowSwapHorizontal, AddCircle, Trash, Convertshape, Warning2,
} from 'iconsax-react-native';
import { COLORS } from '../theme/colors';
import { fontFamilyFor } from '../theme/fonts';

const MAP = {
  '📊': Chart2, '⚙️': Setting2, '📄': DocumentText, '🚪': Logout,
  '🔍': SearchNormal1, '📋': ClipboardText, '📦': Box, '💵': Money,
  '🏦': Bank, '➕': Add, '👥': People, '💰': Wallet3, '📱': Mobile,
  '🔒': Lock1, '🔐': Lock1, '✅': TickCircle, '❌': CloseCircle, '💾': DocumentDownload, '🎁': Gift,
  '👤': User, '✉️': Sms, 'ℹ️': InfoCircle, '→': ArrowRight, '←': ArrowLeft,
  '📝': Edit2, '💎': Diamonds, '💸': Coin1, '📈': TrendUp, '📉': TrendDown, '🔄': Refresh2, '📅': Calendar,
};

// Ionicons name -> Iconsax icon
const NAMED = {
  'close-circle': CloseCircle, 'close-circle-outline': CloseCircle,
  'calendar-outline': Calendar, 'play-back': Previous, 'play-forward': Next,
  'chevron-back': ArrowLeft2, 'chevron-forward': ArrowRight2,
  'chevron-up': ArrowUp2, 'chevron-down': ArrowDown2,
  'alert-circle': Danger, 'warning-outline': Warning2,
  'swap-horizontal': ArrowSwapHorizontal, 'checkmark-done': TickCircle,
  'checkmark-circle': TickCircle, 'checkmark-circle-outline': TickCircle,
  'add-circle-outline': AddCircle, 'trash-outline': Trash,
  'git-compare-outline': Convertshape, 'document-text-outline': DocumentText,
  'pencil-outline': Edit2, 'person-add-outline': UserAdd, 'cash-outline': Moneys,
};

export const Icon = ({ name, size = 18, color = COLORS.textSecondary, style, variant = 'Linear' }) => {
  const Glyph = MAP[name];
  if (!Glyph) {
    return <Text style={[{ fontSize: size, color, fontFamily: fontFamilyFor('400') }, style]}>{name}</Text>;
  }
  return <Glyph size={size} color={color} variant={variant} style={style} />;
};

export const AppIcon = ({ name, size = 18, color = COLORS.textSecondary, style, variant = 'Linear' }) => {
  const Glyph = NAMED[name];
  if (!Glyph) return null;
  return <Glyph size={size} color={color} variant={variant} style={style} />;
};
