import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  accessibilityLabel,
}: SearchFieldProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={17} color={theme.textFaint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        style={[styles.input, { color: theme.text }]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={17} color={theme.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
});
