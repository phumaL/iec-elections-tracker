import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { spacing, useTheme } from '@/theme';

export default function NotFoundScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.xl },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>
          404
        </Text>
      </View>
      <View style={styles.body}>
        <EmptyState
          icon="compass-outline"
          title="Screen not found"
          message="That page does not exist in this app."
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>
                Back to overview
              </Text>
            </Pressable>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -4,
    opacity: 0.12,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 999,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
});
