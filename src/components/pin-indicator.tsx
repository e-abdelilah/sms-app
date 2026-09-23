import { StyleSheet, View, useColorScheme } from 'react-native';

import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { PIN_LENGTH } from '@/security/pin-policy';

type PinIndicatorProps = {
  length: number;
};

export function PinIndicator({ length }: PinIndicatorProps) {
  const palette = getSecureSmsColors(useColorScheme());
  const visibleLength = Math.max(0, Math.min(length, PIN_LENGTH));

  return (
    <View
      accessible
      accessibilityLabel={`${visibleLength} chiffres saisis sur ${PIN_LENGTH}`}
      style={styles.dots}>
      {Array.from({ length: PIN_LENGTH }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index < visibleLength ? palette.primary : palette.surfaceMuted,
              borderColor: index < visibleLength ? palette.primary : palette.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 8,
    borderWidth: 1,
    height: 14,
    width: 14,
  },
});
