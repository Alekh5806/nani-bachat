/**
 * Nani Bachat Color Theme
 * Inspired by Groww — clean dark fintech with minimal accents.
 * Deep charcoal bg, bright green for profit, flat cards, no glow.
 */
export const COLORS = {
  // ── Base Colors ──
  background: '#121212',        // True dark (Groww-style)
  cardBg: '#1E1E1E',            // Card surface
  cardBgAlt: '#1A1A1A',         // Alternative card
  surface: '#2A2A2A',           // Elevated surface
  surfaceLight: '#333333',      // Lighter surface

  // ── Accent ──
  accent: '#00D09C',            // Groww green (brand color)
  accentLight: '#33DABA',       // Lighter accent
  accentDark: '#00B386',        // Darker accent
  teal: '#00D09C',              // Same as accent
  tealLight: '#33DABA',
  tealDark: '#00B386',

  // ── Gradient Pairs ──
  gradientStart: '#00D09C',     // Groww green
  gradientEnd: '#00B386',       // Deeper green
  gradientPurple: '#7C3AED',    // Purple for variety
  gradientPink: '#E91E63',      // Pink accent

  // ── Text Colors ──
  textPrimary: '#FFFFFF',       // Pure white
  textSecondary: '#B0B0B0',     // Grey text
  textMuted: '#787878',         // Muted grey
  textInverse: '#121212',       // Dark text on light bg

  // ── Status Colors ──
  profit: '#5AC53A',            // Groww profit green
  profitLight: '#7DD65E',
  profitBg: 'rgba(90, 197, 58, 0.12)',
  loss: '#EB5B3C',              // Groww loss red/orange
  lossLight: '#F07D64',
  lossBg: 'rgba(235, 91, 60, 0.12)',
  warning: '#FFB74D',           // Amber
  warningBg: 'rgba(255, 183, 77, 0.12)',
  info: '#42A5F5',              // Info blue

  // ── UI Elements ──
  border: '#2A2A2A',
  borderLight: '#333333',
  divider: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glass: '#1E1E1E',             // No transparency — flat
  glassLight: '#232323',
  glassBorder: 'rgba(255, 255, 255, 0.06)',

  // ── Tab Bar ──
  tabBarBg: '#121212',
  tabBarActive: '#00D09C',
  tabBarInactive: '#787878',

  // ── Input ──
  inputBg: '#1E1E1E',
  inputBorder: '#333333',
  inputFocus: '#00D09C',
  placeholder: '#666666',

  // ── Button ──
  buttonPrimary: '#00D09C',
  buttonSecondary: '#2A2A2A',
  buttonDanger: '#EB5B3C',
  buttonDisabled: '#333333',
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
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
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
