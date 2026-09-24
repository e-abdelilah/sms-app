import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { getSecureSmsColors } from '@/constants/secure-sms-theme';

const digitRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

type PinKeypadProps = {
  compact?: boolean;
  disabled?: boolean;
  onDelete: () => void;
  onDigit: (digit: string) => void;
};

type KeyButtonProps = {
  accessibilityLabel: string;
  children: string;
  compact: boolean;
  disabled: boolean;
  onPress: () => void;
  primary?: boolean;
};

function KeyButton({
  accessibilityLabel,
  children,
  compact,
  disabled,
  onPress,
  primary = false,
}: KeyButtonProps) {
  const palette = getSecureSmsColors(useColorScheme());

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        compact && styles.keyCompact,
        {
          backgroundColor: primary ? palette.primarySoft : pressed ? palette.surfaceMuted : palette.surface,
          borderColor: primary ? palette.primary : palette.border,
        },
        disabled && styles.keyDisabled,
      ]}>
      <Text
        style={[
          styles.keyLabel,
          { color: primary ? palette.primary : palette.text },
          primary && styles.deleteLabel,
        ]}>
        {children}
      </Text>
    </Pressable>
  );
}

export function PinKeypad({ compact = false, disabled = false, onDelete, onDigit }: PinKeypadProps) {
  return (
    <View style={[styles.keypad, compact && styles.keypadCompact]}>
      {digitRows.map((row) => (
        <View key={row.join('')} style={[styles.row, compact && styles.rowCompact]}>
          {row.map((digit) => (
            <KeyButton
              key={digit}
              accessibilityLabel={`Saisir ${digit}`}
              compact={compact}
              disabled={disabled}
              onPress={() => onDigit(digit)}>
              {digit}
            </KeyButton>
          ))}
        </View>
      ))}
      <View style={[styles.row, compact && styles.rowCompact]}>
        <View style={styles.placeholder} />
        <KeyButton accessibilityLabel="Saisir 0" compact={compact} disabled={disabled} onPress={() => onDigit('0')}>
          0
        </KeyButton>
        <KeyButton accessibilityLabel="Effacer le dernier chiffre" compact={compact} disabled={disabled} onPress={onDelete} primary>
          Effacer
        </KeyButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: {
    gap: 10,
    maxWidth: 360,
    width: '100%',
  },
  keypadCompact: {
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowCompact: {
    gap: 7,
  },
  key: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  keyCompact: {
    borderRadius: 15,
    minHeight: 48,
  },
  keyDisabled: {
    opacity: 0.45,
  },
  keyLabel: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  deleteLabel: {
    fontSize: 13,
  },
  placeholder: {
    flex: 1,
  },
});
