import { Platform } from 'react-native';

const PrimaryColor = '#FF6F00'; // Vivid Orange
const SecondaryColor = '#EF6C00'; // Rich Deep Orange
const AmberColor = '#FFB300'; // Warm Glow

export const Colors = {
  common: {
    primary: PrimaryColor,
    secondary: SecondaryColor,
    accent: AmberColor,
    success: '#FFA000',
    danger: '#FF3D00',
    warning: '#FF8F00',
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  },
  light: {
    background: '#FFFFFF',
    cardBg: '#F8F9FA',
    text: '#1A1A1A',
    textMuted: '#757575',
    glassBorder: 'rgba(255, 111, 0, 0.1)',
    tabBar: '#FFFFFF',
    tint: PrimaryColor,
    overlay: 'rgba(0,0,0,0.02)',
    shadow: 'rgba(255, 111, 0, 0.15)',
  },
  dark: {
    background: '#050505', // Deepest Black
    cardBg: '#121212', // Material Surface
    text: '#FFFFFF',
    textMuted: '#9E9E9E',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    tabBar: '#050505',
    tint: PrimaryColor,
    overlay: 'rgba(255, 255, 255, 0.03)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  }
};

export const Gaps = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 24,
  xl: 32,
  full: 999,
};


export const getColors = (isDark: boolean) => {
  const theme = isDark ? Colors.dark : Colors.light;
  return {
    ...Colors.common,
    ...theme,
  };
};

export const Fonts = {
  regular: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', fontWeight: '400' as const },
  medium: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium', fontWeight: '500' as const },
  bold: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed', fontWeight: '700' as const },
  heavy: { fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed', fontWeight: '900' as const },
};



