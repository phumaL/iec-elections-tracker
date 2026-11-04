import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ResultsProvider } from '@/context/results';
import { SettingsProvider } from '@/context/settings';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <ResultsProvider>
            <RootNavigator />
          </ResultsProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="province/[id]" />
        <Stack.Screen name="municipality/[id]" />
        <Stack.Screen name="party/[id]" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
