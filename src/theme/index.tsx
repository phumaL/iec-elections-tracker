import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/context/settings';

export interface Theme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  hero: string;
  heroDeep: string;
  heroText: string;
  heroMuted: string;
  live: string;
  liveSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  border: string;
  borderStrong: string;
  tabInactive: string;
  skeleton: string;
  overlay: string;
}

const lightTheme: Theme = {
  isDark: false,
  background: '#F3F6FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EAF0FA',
  surfaceRaised: '#FFFFFF',
  text: '#0B1B33',
  textMuted: '#52627A',
  textFaint: '#8492A8',
  primary: '#0047BA',
  primaryDark: '#002F7A',
  primarySoft: '#E7EEFF',
  onPrimary: '#FFFFFF',
  hero: '#0047BA',
  heroDeep: '#002B6E',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.74)',
  live: '#16A34A',
  liveSoft: '#DCFCE7',
  success: '#12805C',
  successSoft: '#DDF6EE',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  border: '#DCE4F2',
  borderStrong: '#C7D3E8',
  tabInactive: '#72809A',
  skeleton: '#E7EDF7',
  overlay: 'rgba(5,15,35,0.45)',
};

const darkTheme: Theme = {
  isDark: true,
  background: '#070C16',
  surface: '#101827',
  surfaceAlt: '#172134',
  surfaceRaised: '#152033',
  text: '#F5F8FF',
  textMuted: '#A2AFC2',
  textFaint: '#728097',
  primary: '#6C9DFF',
  primaryDark: '#3B74E8',
  primarySoft: '#162B52',
  onPrimary: '#06122A',
  hero: '#0B2E6B',
  heroDeep: '#061A40',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.72)',
  live: '#4ADE80',
  liveSoft: '#0F2E1D',
  success: '#34D399',
  successSoft: '#0D2B22',
  warning: '#FBBF24',
  warningSoft: '#33260A',
  danger: '#F87171',
  dangerSoft: '#361414',
  border: '#213049',
  borderStrong: '#2E4160',
  tabInactive: '#8290A6',
  skeleton: '#1A2437',
  overlay: 'rgba(0,0,0,0.6)',
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const systemScheme = useColorScheme();

  const theme = useMemo(() => {
    const preference =
      settings.theme === 'system'
        ? (systemScheme ?? 'light')
        : settings.theme;
    return preference === 'dark' ? darkTheme : lightTheme;
  }, [settings.theme, systemScheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return theme;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const type = {
  display: 46,
  h1: 30,
  h2: 22,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;
