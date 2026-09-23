import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinIndicator } from '@/components/pin-indicator';
import { PinKeypad } from '@/components/pin-keypad';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useAuth } from '@/context/auth-context';
import { getDurationInSeconds, MAX_PIN_FAILED_ATTEMPTS } from '@/security/pin-attempt-policy';
import { PIN_LENGTH } from '@/security/pin-policy';

type Props = {
  actionLabel: string;
  onAuthenticated: () => void;
  onCancel: () => void;
  visible: boolean;
};

function useDeadlineCountdown(deadline: number | null) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (deadline === null) return;

    let timeout: ReturnType<typeof setTimeout>;
    const update = () => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setRemainingSeconds(getDurationInSeconds(remainingMs));
      if (remainingMs > 0) timeout = setTimeout(update, Math.min(remainingMs, 250));
    };

    timeout = setTimeout(update, 0);
    return () => clearTimeout(timeout);
  }, [deadline]);

  return remainingSeconds;
}

export function PinReauthenticationModal({
  actionLabel,
  onAuthenticated,
  onCancel,
  visible,
}: Props) {
  const palette = getSecureSmsColors(useColorScheme());
  const { pinProtection, reauthenticate } = useAuth();
  const pinRef = useRef('');
  const [entryLength, setEntryLength] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const retrySeconds = useDeadlineCountdown(pinProtection.retryAvailableAt);
  const lockSeconds = useDeadlineCountdown(pinProtection.temporarilyLockedUntil);
  const isTemporarilyLocked = pinProtection.temporarilyLockedUntil !== null;
  const isRetryDelayed = !isTemporarilyLocked && pinProtection.retryAvailableAt !== null;
  const isBlocked = isTemporarilyLocked || isRetryDelayed;

  const clearEntry = useCallback(() => {
    pinRef.current = '';
    setEntryLength(0);
  }, []);

  const handleCancel = useCallback(() => {
    clearEntry();
    setFeedback(null);
    onCancel();
  }, [clearEntry, onCancel]);

  const submitPin = useCallback(
    (pin: string) => {
      clearEntry();
      const result = reauthenticate(pin);

      if (result.status === 'accepted') {
        setFeedback(null);
        onAuthenticated();
        return;
      }

      if (result.status === 'rejected') {
        const plural = result.remainingAttempts > 1 ? 's' : '';
        setFeedback(
          `PIN incorrect. ${result.remainingAttempts} tentative${plural} restante${plural}.`,
        );
        return;
      }

      if (result.status === 'temporarily-locked') {
        setFeedback('Trop de tentatives incorrectes. Réauthentification temporairement bloquée.');
        return;
      }

      if (result.status === 'retry-delayed') {
        setFeedback('Patientez avant le prochain essai.');
        return;
      }

      setFeedback(`Saisissez exactement ${PIN_LENGTH} chiffres.`);
    },
    [clearEntry, onAuthenticated, reauthenticate],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isBlocked) return;
      const nextPin = `${pinRef.current}${digit}`;
      if (nextPin.length > PIN_LENGTH) return;

      pinRef.current = nextPin;
      setEntryLength(nextPin.length);
      setFeedback(null);
      if (nextPin.length === PIN_LENGTH) submitPin(nextPin);
    },
    [isBlocked, submitPin],
  );

  const handleDelete = useCallback(() => {
    if (isBlocked) return;
    pinRef.current = pinRef.current.slice(0, -1);
    setEntryLength(pinRef.current.length);
    setFeedback(null);
  }, [isBlocked]);

  return (
    <Modal animationType="slide" onRequestClose={handleCancel} transparent visible={visible}>
      <SafeAreaView style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: palette.background, borderColor: palette.border }]}>
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text style={[styles.eyebrow, { color: palette.primary }]}>ACTION SENSIBLE</Text>
              <Text style={[styles.title, { color: palette.text }]}>Confirmez votre identité</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={handleCancel} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: palette.primary }]}>Annuler</Text>
            </Pressable>
          </View>

          <Text style={[styles.description, { color: palette.textMuted }]}>
            Entrez votre PIN pour {actionLabel}. Cette vérification renouvelle aussi la session locale.
          </Text>

          <View style={styles.indicatorBlock}>
            <PinIndicator length={entryLength} />
            <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: palette.textMuted }]}>
              {isTemporarilyLocked
                ? `Réessayez dans ${Math.max(1, lockSeconds)} s.`
                : isRetryDelayed
                  ? `Prochain essai dans ${Math.max(1, retrySeconds)} s.`
                  : feedback ?? `${MAX_PIN_FAILED_ATTEMPTS} essais maximum.`}
            </Text>
          </View>

          <PinKeypad disabled={isBlocked} onDelete={handleDelete} onDigit={handleDigit} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 22,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 5,
  },
  cancelButton: {
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  indicatorBlock: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 28,
  },
  feedback: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 14,
    minHeight: 18,
    textAlign: 'center',
  },
});
