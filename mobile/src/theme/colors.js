/**
 * Nani Bachat Color Theme
 * Inspired by Groww — clean dark fintech with minimal accents.
 * Deep charcoal bg, bright green for profit, flat cards, no glow.
 */
import { Appearance, StyleSheet } from 'react-native';
import { applyFont } from './fonts';

/**
 * Two palettes, one shared COLORS object.
 * COLORS is mutated in place when the theme changes, and `themedStyles`
 * rebuilds style sheets for the new values, so screens keep using
 * `COLORS.x` and `styles.x` exactly as before.
 */
const DARK = {
  isDark: true,
  background: '#111213',
  cardBg: '#18191B',
  cardBgAlt: '#1F2023',
  surface: '#1F2023',
  surfaceLight: '#2A2B2F',
  cardElevated: '#1F2023',

  // Primary (brand blue)
  accent: '#879DFF',
  accentLight: '#4D6BFF',
  accentDark: '#1E41DB',
  onAccent: '#FFFFFF',
  teal: '#4D6BFF',
  tealLight: '#4D6BFF',
  tealDark: '#1E41DB',

  gradientStart: '#4D6BFF',
  gradientEnd: '#1E41DB',
  gradientPurple: '#4D6BFF',
  gradientPink: '#4D6BFF',

  textPrimary: '#F3F2EF',
  textSecondary: '#A5A39D',
  textMuted: '#9A9690',
  textInverse: '#111213',

  // Semantic: positive / negative / warning / neutral
  profit: '#22C55E',
  profitLight: '#22C55E',
  profitBg: '#12351F',
  loss: '#F87171',
  lossLight: '#F87171',
  lossBg: '#3A171B',
  warning: '#F59E0B',
  warningBg: '#3A2A0D',
  neutral: '#A5A39D',
  neutralBg: '#1F2023',
  info: '#879DFF',
  chartCategories: ['#4D6BFF', '#6E87FF', '#9BACFF', '#8A8780', '#A5A39D', '#C4C1B9'],

  border: '#2A2B2F',
  borderLight: '#2A2B2F',
  divider: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glass: '#18191B',
  glassLight: '#1F2023',
  glassBorder: '#2A2B2F',

  // Company logo container
  logoBg: '#1F2023',
  logoBorder: '#2A2B2F',

  tabBarBg: '#111213',
  tabBarActive: '#879DFF',
  tabBarInactive: '#F3F2EF',

  inputBg: '#18191B',
  inputBorder: '#777670',
  inputFocus: '#879DFF',
  placeholder: '#9A9690',

  buttonPrimary: '#465FE2',
  buttonPrimaryPressed: '#3954D0',
  buttonSecondary: '#1F2023',
  buttonDanger: '#BD2737',
  buttonDisabled: '#2A2B2F',
};

const LIGHT = {
  ...DARK,
  isDark: false,
  background: '#F6F5F2',
  cardBg: '#FFFFFF',
  cardBgAlt: '#F1F0EC',
  surface: '#F1F0EC',
  surfaceLight: '#E7E5DF',
  cardElevated: '#FFFFFF',

  accent: '#1E41DB',
  accentLight: '#4D6BFF',
  accentDark: '#060923',
  onAccent: '#FFFFFF',
  teal: '#1E41DB',
  tealLight: '#4D6BFF',
  tealDark: '#060923',

  gradientStart: '#1E41DB',
  gradientEnd: '#060923',
  gradientPurple: '#1E41DB',
  gradientPink: '#1E41DB',

  textPrimary: '#161615',
  textSecondary: '#5C5A55',
  textMuted: '#64615B',
  textInverse: '#FFFFFF',

  profit: '#137535',
  profitLight: '#137535',
  profitBg: '#DCFCE7',
  loss: '#B91C1C',
  lossLight: '#B91C1C',
  lossBg: '#FEE2E2',
  warning: '#92400E',
  warningBg: '#FEF3C7',
  neutral: '#64615B',
  neutralBg: '#F1F0EC',
  info: '#1E41DB',
  chartCategories: ['#2845AD', '#4964CF', '#667CDD', '#58564F', '#6F6C63', '#858278'],

  border: '#E7E5DF',
  borderLight: '#E7E5DF',
  divider: 'rgba(0, 0, 0, 0.07)',
  overlay: 'rgba(0, 0, 0, 0.45)',
  glass: '#FFFFFF',
  glassLight: '#FFFFFF',
  glassBorder: '#E7E5DF',

  logoBg: '#F1F0EC',
  logoBorder: '#E7E5DF',

  tabBarBg: '#FFFFFF',
  tabBarActive: '#1E41DB',
  tabBarInactive: '#161615',

  inputBg: '#FFFFFF',
  inputBorder: '#85827A',
  inputFocus: '#1E41DB',
  placeholder: '#64615B',

  buttonPrimary: '#1E41DB',
  buttonPrimaryPressed: '#1835B8',
  buttonSecondary: '#F1F0EC',
  buttonDanger: '#B91C1C',
  buttonDisabled: '#E7E5DF',
};

export const PALETTES = { dark: DARK, light: LIGHT };

const systemMode = () => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');

export const COLORS = { ...PALETTES[systemMode()] };

let themeVersion = 0;

export const applyThemeMode = (mode) => {
  Object.assign(COLORS, PALETTES[mode] || DARK);
  themeVersion += 1;
};

export const resolveMode = (preference) =>
  preference === 'light' || preference === 'dark' ? preference : systemMode();

/**
 * Like StyleSheet.create, but the sheet is rebuilt whenever the theme changes.
 * Usage: const styles = themedStyles(() => ({ card: { backgroundColor: COLORS.cardBg } }));
 */
export const themedStyles = (factory) => {
  let cache = null;
  let builtFor = -1;
  const sheet = () => {
    if (builtFor !== themeVersion) {
      cache = StyleSheet.create(applyFont(factory()));
      builtFor = themeVersion;
    }
    return cache;
  };
  return new Proxy({}, {
    get: (_, key) => sheet()[key],
    has: (_, key) => key in sheet(),
    ownKeys: () => Reflect.ownKeys(sheet()),
    getOwnPropertyDescriptor: (_, key) => ({ enumerable: true, configurable: true, value: sheet()[key] }),
  });
};

/**
 * Spacing system (4px base)
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

const heading = { fontSize: 16, lineHeight: 22, fontWeight: '600' };
const metadata = { fontSize: 12, lineHeight: 18, fontWeight: '400' };
const label = { fontSize: 13, lineHeight: 18, fontWeight: '500' };
const control = { fontSize: 14, lineHeight: 20, fontWeight: '500' };
const numeric = { fontVariant: ['tabular-nums'] };

// Use the same role for the same kind of text across screens. themedStyles
// supplies the Inter family for the token's weight.
export const TYPE = {
  screenTitle: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  sectionTitle: heading,
  cardTitle: heading,
  rowTitle: control,
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  secondary: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  secondaryMedium: label,
  infoTitle: metadata,
  caption: metadata,
  captionMedium: { ...metadata, fontWeight: '500' },
  button: { ...control, fontWeight: '600' },
  inputText: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  inputLabel: label,
  tab: control,
  navLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  portfolioValue: { ...numeric, fontSize: 28, lineHeight: 34, fontWeight: '600' },
  stockPrice: { ...numeric, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  listAmount: { ...numeric, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  smallValue: { ...numeric, ...label },
  plPercent: { ...numeric, ...label },
};

/**
 * Border radius
 */
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

/**
 * Shadows — subtle, no glow
 */
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLight: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  glow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
};
