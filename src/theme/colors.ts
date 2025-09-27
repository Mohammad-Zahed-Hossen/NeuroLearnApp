export type ThemeType = 'dark' | 'light';

export const colors = {
  dark: {
    // Primary Palette - Ocean Blues (Calm & Professional)
    primary: '#0EA5E9', // Sky blue - promotes mental clarity
    primaryDark: '#0284C7', // Deep blue - for contrast
    primaryLight: '#38BDF8', // Light blue - highlights
    secondary: '#06B6D4', // Teal - complementary cognitive color
    accent: '#F59E0B', // Amber - for attention/actions
    tertiary: '#8B5CF6', // Purple - for premium features

    // Background System - Deep Ocean Inspired
    background: '#0A0F1A', // Rich dark blue-black
    surface: '#111827', // Elevated surface with blue undertones
    surfaceLight: '#1E293B', // Higher elevation
    surfaceElevated: '#2D3748', // Highest elevation

    // Text Hierarchy - Optimized for Dark Mode
    text: '#F0F9FF', // Soft blue-tinted white
    textSecondary: '#E0F2FE', // Secondary with better contrast
    textMuted: '#94A3B8', // Muted but readable
    textInverted: '#0A0F1A', // For text on primary colors

    // Semantic Colors - Ocean-Themed
    success: '#10B981', // Emerald green
    warning: '#F59E0B', // Amber yellow
    error: '#EF4444', // Soft red
    info: '#0EA5E9', // Sky blue
    cognitive: '#06B6D4', // Teal for cognitive states

    // Border System - Water-Inspired
    border: '#1E40AF', // Ocean border
    borderLight: '#3B82F6', // Light borders
    borderFocus: '#0EA5E9', // Focus states

    // Enhanced Glass Morphism (Water-like transparency)
    glass: 'rgba(14, 165, 233, 0.12)',
    glassBorder: 'rgba(14, 165, 233, 0.20)',
    glassHighlight: 'rgba(255, 255, 255, 0.15)',
    glassShadow: 'rgba(0, 0, 0, 0.30)',

    // Gradient Definitions
    gradientPrimary: ['#0EA5E9', '#38BDF8'],
    gradientSecondary: ['#06B6D4', '#0EA5E9'],
    gradientSuccess: ['#10B981', '#34D399'],
    gradientBackground: ['#0A0F1A', '#111827'],

    // Special Effects
    glow: 'rgba(14, 165, 233, 0.35)',
    shadow: 'rgba(0, 0, 0, 0.45)',

    // Cognitive Load Indicators
    loadLow: '#10B981', // Green
    loadOptimal: '#0EA5E9', // Blue
    loadModerate: '#F59E0B', // Amber
    loadHigh: '#EF4444', // Red
  },

  light: {
    // Primary Palette - Fresh & Clean
    primary: '#0369A1', // Deep blue for visibility
    primaryDark: '#075985', // Even deeper for contrast
    primaryLight: '#0EA5E9', // Bright blue
    secondary: '#0891B2', // Teal for cognitive focus
    accent: '#D97706', // Amber for attention
    tertiary: '#7C3AED', // Purple for accents

    // Background System - Clean & Airy
    background: '#F0F9FF', // Light blue tinted white
    surface: '#FFFFFF', // Pure white
    surfaceLight: '#F8FAFC', // Light gray
    surfaceElevated: '#E2E8F0', // Medium gray

    // Text Hierarchy - High Contrast
    text: '#0C4A6E', // Deep blue text
    textSecondary: '#475569', // Dark gray
    textMuted: '#64748B', // Medium gray
    textInverted: '#FFFFFF', // White text

    // Semantic Colors - Vibrant for Light Mode
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0369A1',
    cognitive: '#0891B2',

    // Border System
    border: '#CBD5E1',
    borderLight: '#E2E8F0',
    borderFocus: '#0369A1',

    // Enhanced Glass Morphism for Light Mode
    glass: 'rgba(3, 105, 161, 0.08)',
    glassBorder: 'rgba(3, 105, 161, 0.15)',
    glassHighlight: 'rgba(255, 255, 255, 0.85)',
    glassShadow: 'rgba(0, 0, 0, 0.12)',

    // Gradient Definitions
    gradientPrimary: ['#0369A1', '#0EA5E9'],
    gradientSecondary: ['#0891B2', '#06B6D4'],
    gradientSuccess: ['#059669', '#10B981'],
    gradientBackground: ['#F0F9FF', '#E0F2FE'],

    // Special Effects
    glow: 'rgba(3, 105, 161, 0.25)',
    shadow: 'rgba(0, 0, 0, 0.18)',

    // Cognitive Load Indicators
    loadLow: '#059669',
    loadOptimal: '#0369A1',
    loadModerate: '#D97706',
    loadHigh: '#DC2626',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Enhanced shadows with realistic water-like depth
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 26,
    elevation: 16,
  },
  glow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  glowLight: {
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
};

// Enhanced typography with better readability
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0.15,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
};

// Animation constants for smooth transitions
export const animations = {
  quick: 200,
  standard: 300,
  complex: 500,
  enter: 600,
  exit: 400,
};

// Z-index system for proper layering
export const zIndex = {
  dropdown: 1000,
  modal: 900,
  overlay: 800,
  sticky: 700,
  header: 600,
  elevated: 500,
  base: 1,
  behind: -1,
};

// Breakpoints for responsive design
export const breakpoints = {
  mobile: 320,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Cognitive load color mapping utility
export const getCognitiveLoadColor = (
  load: number,
  theme: ThemeType,
): string => {
  const themeColors = colors[theme];

  if (load > 1.5) return themeColors.loadHigh;
  if (load > 1.2) return themeColors.loadModerate;
  if (load < 0.8) return themeColors.loadLow;
  return themeColors.loadOptimal;
};

// Accessibility utilities
export const accessibility = {
  getContrastColor: (backgroundColor: string, theme: ThemeType): string => {
    return theme === 'dark' ? colors.dark.text : colors.light.text;
  },

  minimumTouchSize: 44,
  focusOutlineWidth: 2,
};

// Glass morphism presets
export const glassPresets = {
  card: {
    dark: {
      background: 'rgba(17, 24, 39, 0.70)',
      border: 'rgba(14, 165, 233, 0.15)',
      backdropFilter: 'blur(20px)',
    },
    light: {
      background: 'rgba(255, 255, 255, 0.75)',
      border: 'rgba(3, 105, 161, 0.12)',
      backdropFilter: 'blur(15px)',
    },
  },
  modal: {
    dark: {
      background: 'rgba(17, 24, 39, 0.85)',
      border: 'rgba(14, 165, 233, 0.20)',
      backdropFilter: 'blur(25px)',
    },
    light: {
      background: 'rgba(255, 255, 255, 0.90)',
      border: 'rgba(3, 105, 161, 0.15)',
      backdropFilter: 'blur(20px)',
    },
  },
};

// Theme-specific utilities
export const themeUtils = {
  getGlassBackground: (
    theme: ThemeType,
    intensity: 'light' | 'medium' | 'heavy' = 'medium',
  ) => {
    const baseColor =
      theme === 'dark' ? colors.dark.surface : colors.light.surface;
    const opacities = { light: 0.4, medium: 0.7, heavy: 0.9 };
    return (
      baseColor +
      Math.round(opacities[intensity] * 255)
        .toString(16)
        .padStart(2, '0')
    );
  },

  createGradient: (colors: string[], angle: number = 135) => {
    return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
  },
};
