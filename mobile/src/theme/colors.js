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
  background: '#0B0F19',
  cardBg: '#111827',
  cardBgAlt: '#172033',
  surface: '#172033',
  surfaceLight: '#263244',
  cardElevated: '#172033',

  // Primary (brand blue)
  accent: '#4D6BFF',
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

  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0B0F19',

  // Semantic: positive / negative / warning / neutral
  profit: '#22C55E',
  profitLight: '#22C55E',
  profitBg: '#12351F',
  loss: '#F87171',
  lossLight: '#F87171',
  lossBg: '#3A171B',
  warning: '#F59E0B',
  warningBg: '#3A2A0D',
  neutral: '#9CA3AF',
  neutralBg: '#172033',
  info: '#4D6BFF',

  border: '#263244',
  borderLight: '#263244',
  divider: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glass: '#111827',
  glassLight: '#172033',
  glassBorder: '#263244',

  // Company logo container
  logoBg: '#172033',
  logoBorder: '#263244',

  tabBarBg: '#0B0F19',
  tabBarActive: '#4D6BFF',
  tabBarInactive: '#6B7280',

  inputBg: '#111827',
  inputBorder: '#263244',
  inputFocus: '#4D6BFF',
  placeholder: '#6B7280',

  buttonPrimary: '#4D6BFF',
  buttonSecondary: '#172033',
  buttonDanger: '#F87171',
  buttonDisabled: '#263244',
};

const LIGHT = {
  ...DARK,
  isDark: false,
  background: '#F5F6F8',
  cardBg: '#FFFFFF',
  cardBgAlt: '#F3F4F6',
  surface: '#F3F4F6',
  surfaceLight: '#E5E7EB',
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

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  profit: '#16A34A',
  profitLight: '#16A34A',
  profitBg: '#DCFCE7',
  loss: '#DC2626',
  lossLight: '#DC2626',
  lossBg: '#FEE2E2',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  neutral: '#6B7280',
  neutralBg: '#F3F4F6',
  info: '#1E41DB',

  border: '#E5E7EB',
  borderLight: '#E5E7EB',
  divider: 'rgba(0, 0, 0, 0.07)',
  overlay: 'rgba(0, 0, 0, 0.45)',
  glass: '#FFFFFF',
  glassLight: '#FFFFFF',
  glassBorder: '#E5E7EB',

  logoBg: '#F3F4F6',
  logoBorder: '#E5E7EB',

  tabBarBg: '#FFFFFF',
  tabBarActive: '#1E41DB',
  tabBarInactive: '#9CA3AF',

  inputBg: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputFocus: '#1E41DB',
  placeholder: '#9CA3AF',

  buttonPrimary: '#1E41DB',
  buttonSecondary: '#F3F4F6',
  buttonDanger: '#DC2626',
  buttonDisabled: '#E5E7EB',
};

export const PALETTES = { dark: DARK, light: LIGHT };

const systemMode = () => (Appearance.getColorScheme() === 'light' ? 'light' : 'dark');

export const COLORS = { ...PALETTES[systemMode()] };

let themeVersion = 0;
export const getThemeVersion = () => themeVersion;

/** Swap the palette in place. Returns the new version number. */
export const applyThemeMode = (mode) => {
  Object.assign(COLORS, PALETTES[mode] || DARK);
  themeVersion += 1;
  return themeVersion;
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

/**
 * Font sizes
 */
export const FONTS = {
  xs: 12,   // caption / metadata
  sm: 13,   // secondary text, input label, tab label
  md: 14,   // body / primary text, input text, button
  lg: 16,   // card / row title
  xl: 20,   // stock price
  xxl: 24,  // screen title
  xxxl: 32,
  hero: 40,
};

/**
 * Semantic typography: the single source of truth for text styles.
 * Spread one into a style: `...TYPE.cardTitle`. The font family follows the
 * weight (see theme/fonts.js). Use the token whose meaning matches the text;
 * same meaning = same token on every screen.
 */
export const TYPE = {
  screenTitle: { fontSize: 24, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '600' },      // names, row titles
  body: { fontSize: 14, fontWeight: '500' },           // default primary text
  secondary: { fontSize: 13, fontWeight: '400' },      // supporting text
  secondaryMedium: { fontSize: 13, fontWeight: '500' },
  // Rule: column / info titles above a list (for example "Stocks (10)" and "Current (Invested)") use infoTitle.
  infoTitle: { fontSize: 9, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },        // metadata: phone, date, symbol
  captionMedium: { fontSize: 12, fontWeight: '500' },  // badges, small links
  button: { fontSize: 14, fontWeight: '600' },
  inputText: { fontSize: 14, fontWeight: '500' },
  inputLabel: { fontSize: 13, fontWeight: '500' },
  tab: { fontSize: 13, fontWeight: '600' },
  // Financial values
  portfolioValue: { fontSize: 28, fontWeight: '600' },
  stockPrice: { fontSize: 20, fontWeight: '600' },
  plAmount: { fontSize: 18, fontWeight: '600' },
  plPercent: { fontSize: 14, fontWeight: '600' },
  quantity: { fontSize: 14, fontWeight: '600' },
  smallValue: { fontSize: 14, fontWeight: '600' },
};

/**
 * Border radius
 */
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 22,
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
