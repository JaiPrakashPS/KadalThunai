// ─── Brand Colors ───────────────────────────────────────────────────────────
export const COLORS = {
  // Primary palette - deep ocean blues
  primary: '#0066CC',
  primaryDark: '#004499',
  primaryLight: '#3388DD',
  primaryMuted: '#CCE0F5',

  // Secondary - warm amber/gold for fishermen
  secondary: '#F59E0B',
  secondaryDark: '#D97706',
  secondaryLight: '#FCD34D',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // SOS emergency
  sos: '#DC2626',
  sosDark: '#991B1B',
  sosGlow: 'rgba(220, 38, 38, 0.3)',

  // Backgrounds
  background: '#0A1628',
  backgroundMid: '#0F2044',
  backgroundLight: '#1A2F5A',
  surface: '#162340',

  // Text — both naming styles supported across screens
  textPrimary: '#F1F5F9',
  text: '#F1F5F9',          // alias for textPrimary
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0A1628',

  // Borders
  border: '#1E3A5F',
  borderLight: '#2A4A7F',

  // Map zone safety colors
  zonesSafe: '#10B981',
  zonesCaution: '#F59E0B',
  zonesRestricted: '#EF4444',
  zonesDanger: '#7C3AED',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.6)',
  cardGlass: 'rgba(22, 35, 64, 0.85)',
};

// ─── Spacing ────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Border Radius ──────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ─── Font Sizes ─────────────────────────────────────────────────────────────
export const FONT_SIZE = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

// ─── Font Families ──────────────────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  tamilRegular: 'NotoSansTamil-Regular',
  tamilBold: 'NotoSansTamil-Bold',
};

// ─── Shadows ────────────────────────────────────────────────────────────────
// Both short (sm/md/lg) and long (small/medium) names are supported
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  small: {        // alias for sm
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  medium: {       // alias for md
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sos: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
};
