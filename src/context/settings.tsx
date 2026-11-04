import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readJson, STORAGE_KEYS, writeJson } from '@/lib/storage';

export type RefreshInterval = 0 | 30 | 60 | 120;
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  refreshInterval: RefreshInterval;
  theme: ThemePreference;
}

const DEFAULT_SETTINGS: Settings = {
  refreshInterval: 60,
  theme: 'system',
};

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  ready: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    readJson<Settings>(STORAGE_KEYS.settings).then((saved) => {
      if (cancelled) return;

      if (saved) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...saved,
          refreshInterval: ([0, 30, 60, 120] as const).includes(
            saved.refreshInterval as RefreshInterval,
          )
            ? saved.refreshInterval
            : DEFAULT_SETTINGS.refreshInterval,
          theme: ['system', 'light', 'dark'].includes(saved.theme)
            ? saved.theme
            : DEFAULT_SETTINGS.theme,
        });
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void writeJson(STORAGE_KEYS.settings, next);
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    void writeJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  };

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, ready }),
    [settings, ready],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);

  if (!value) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }

  return value;
}
