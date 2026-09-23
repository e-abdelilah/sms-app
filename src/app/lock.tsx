import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinIndicator } from '@/components/pin-indicator';
import { PinKeypad } from '@/components/pin-keypad';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useAuth } from '@/context/auth-context';
import {
  getDurationInSeconds,
  MAX_PIN_FAILED_ATTEMPTS,
} from '@/security/pin-attempt-policy';
import { PIN_LENGTH } from '@/security/pin-policy';

type LockMode = 'create' | 'confirm' | 'unlock';

type Feedback = {
  tone: 'error' | 'success';
  text: string;
};

const screenCopy: Record<
  LockMode,
  { description: string; stage: string; title: string }
> = {
  create: {
    description: `Choisissez ${PIN_LENGTH} chiffres pour activer le verrouillage local.`,
    stage: 'ÉTAPE 1 SUR 2',
    title: 'Créer votre PIN',
  },
  confirm: {
    description: 'Saisissez à nouveau les mêmes chiffres pour confirmer votre PIN.',
    stage: 'ÉTAPE 2 SUR 2',
    title: 'Confirmer votre PIN',
  },
  unlock: {
    description: `Entrez votre PIN à ${PIN_LENGTH} chiffres pour accéder à vos messages.`,
    stage: 'APPLICATION VERROUILLÉE',
    title: 'SecureSMS verrouillé',
  },
};

function useDeadlineCountdown(deadline: number | null) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (deadline === null) return;

    let timeout: ReturnType<typeof setTimeout>;

    const updateCountdown = () => {
      const remainingMs = Math.max(0, deadline - Date.now());
      setRemainingSeconds(getDurationInSeconds(remainingMs));

      if (remainingMs > 0) {
        timeout = setTimeout(updateCountdown, Math.min(remainingMs, 250));
      }
    };

    timeout = setTimeout(updateCountdown, 0);
    return () => clearTimeout(timeout);
  }, [deadline]);

  return deadline === null ? 0 : remainingSeconds;
}

function formatCountdown(remainingSeconds: number) {
  const normalizedSeconds = Math.max(1, remainingSeconds);
  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatRemainingAttempts(remainingAttempts: number) {
  const plural = remainingAttempts > 1 ? 's' : '';
  return `${remainingAttempts} tentative${plural} restante${plural}.`;
}

export default function LockScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const {
    beginEnrollment,
    confirmEnrollment,
    isBiometricEnabled,
    isPinConfigured,
    pinProtection,
    unlock,
    unlockWithBiometrics,
  } = useAuth();
  const [mode, setMode] = useState<LockMode>(isPinConfigured ? 'unlock' : 'create');
  const [entryLength, setEntryLength] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);
  const pinEntryRef = useRef('');
  const retryDelaySeconds = useDeadlineCountdown(pinProtection.retryAvailableAt);
  const temporaryLockSeconds = useDeadlineCountdown(pinProtection.temporarilyLockedUntil);
  const isTemporarilyLocked = pinProtection.temporarilyLockedUntil !== null;
  const isRetryDelayed = !isTemporarilyLocked && pinProtection.retryAvailableAt !== null;
  const isPinThrottled = isTemporarilyLocked || isRetryDelayed;
  const isInputBlocked = isPinThrottled || isBiometricAuthenticating;

  const clearEntry = useCallback(() => {
    pinEntryRef.current = '';
    setEntryLength(0);
  }, []);

  useEffect(
    () => () => {
      pinEntryRef.current = '';
    },
    [],
  );

  const submitPin = useCallback(
    (pin: string) => {
      if (isInputBlocked) return;

      clearEntry();
      setFeedback(null);

      if (mode === 'create') {
        const result = beginEnrollment(pin);

        if (result.status === 'ready-to-confirm') {
          setMode('confirm');
          setFeedback({ text: 'PIN enregistré. Confirmez-le maintenant.', tone: 'success' });
          return;
        }

        setFeedback({ text: `Saisissez exactement ${PIN_LENGTH} chiffres.`, tone: 'error' });
        return;
      }

      if (mode === 'confirm') {
        const result = confirmEnrollment(pin);

        if (result.status === 'configured') {
          setMode('unlock');
          setFeedback({ text: 'PIN créé. Entrez-le pour déverrouiller.', tone: 'success' });
          return;
        }

        setMode('create');
        setFeedback({
          text:
            result.status === 'mismatch'
              ? 'Les PIN ne correspondent pas. Choisissez-en un nouveau.'
              : `Saisissez exactement ${PIN_LENGTH} chiffres.`,
          tone: 'error',
        });
        return;
      }

      const result = unlock(pin);

      if (result.status === 'rejected') {
        setFeedback({
          text: `PIN incorrect. ${formatRemainingAttempts(result.remainingAttempts)}`,
          tone: 'error',
        });
        return;
      }

      if (result.status === 'invalid-pin') {
        setFeedback({ text: `Saisissez exactement ${PIN_LENGTH} chiffres.`, tone: 'error' });
      }
    },
    [beginEnrollment, clearEntry, confirmEnrollment, isInputBlocked, mode, unlock],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (isInputBlocked) return;

      const nextPin = `${pinEntryRef.current}${digit}`;

      if (nextPin.length > PIN_LENGTH) return;

      pinEntryRef.current = nextPin;
      setFeedback(null);
      setEntryLength(nextPin.length);

      if (nextPin.length === PIN_LENGTH) {
        submitPin(nextPin);
      }
    },
    [isInputBlocked, submitPin],
  );

  const handleDelete = useCallback(() => {
    if (isInputBlocked) return;

    pinEntryRef.current = pinEntryRef.current.slice(0, -1);
    setEntryLength(pinEntryRef.current.length);
    setFeedback(null);
  }, [isInputBlocked]);

  const handleBiometricUnlock = useCallback(async () => {
    if (isBiometricAuthenticating) return;

    clearEntry();
    setFeedback(null);
    setIsBiometricAuthenticating(true);

    const result = await unlockWithBiometrics();
    setIsBiometricAuthenticating(false);

    if (result.status === 'authenticated') return;

    switch (result.status) {
      case 'cancelled':
        setFeedback({
          text: 'Authentification biométrique annulée.',
          tone: 'error',
        });
        return;
      case 'locked-out':
        setFeedback({
          text: 'Biométrie verrouillée par Android. Utilisez votre PIN.',
          tone: 'error',
        });
        return;
      case 'not-enrolled':
        setFeedback({
          text: 'Aucune biométrie forte n’est enregistrée. Utilisez votre PIN.',
          tone: 'error',
        });
        return;
      default:
        setFeedback({
          text: 'Biométrie indisponible. Utilisez votre PIN.',
          tone: 'error',
        });
    }
  }, [clearEntry, isBiometricAuthenticating, unlockWithBiometrics]);

  const copy = screenCopy[mode];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Text style={[styles.badgeText, { color: palette.primary }]}>{copy.stage}</Text>
        </View>

        <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>{copy.description}</Text>

        <View style={styles.indicatorBlock}>
          <PinIndicator length={entryLength} />
          {isPinThrottled ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.blockingStatus,
                { backgroundColor: palette.primarySoft, borderColor: palette.border },
              ]}>
              <Text style={[styles.blockingTitle, { color: palette.text }]}>
                {isTemporarilyLocked ? 'Verrouillage temporaire' : 'Temporisation active'}
              </Text>
              <Text style={[styles.blockingText, { color: palette.textMuted }]}>
                {isTemporarilyLocked
                  ? `Trop de PIN incorrects. Réessayez dans ${formatCountdown(temporaryLockSeconds)}.`
                  : `Échec ${pinProtection.failedAttempts} sur ${MAX_PIN_FAILED_ATTEMPTS}. Prochain essai dans ${formatCountdown(retryDelaySeconds)}.`}
              </Text>
            </View>
          ) : (
            <Text style={[styles.indicatorHint, { color: palette.textMuted }]}>
              {PIN_LENGTH} chiffres · {MAX_PIN_FAILED_ATTEMPTS} essais avant verrouillage
            </Text>
          )}
        </View>

        <View accessibilityLiveRegion="polite" style={styles.feedbackSlot}>
          {!isBiometricAuthenticating && feedback ? (
            <Text
              style={[
                styles.feedback,
                { color: feedback.tone === 'success' ? palette.success : palette.text },
              ]}>
              {feedback.text}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomContent}>
        <PinKeypad disabled={isInputBlocked} onDelete={handleDelete} onDigit={handleDigit} />
        {mode === 'unlock' && isBiometricEnabled ? (
          <Pressable
            accessibilityLabel="Utiliser la biométrie"
            accessibilityRole="button"
            disabled={isBiometricAuthenticating}
            onPress={() => void handleBiometricUnlock()}
            style={({ pressed }) => [
              styles.biometricButton,
              { backgroundColor: pressed ? palette.surfaceMuted : palette.surface, borderColor: palette.primary },
              isBiometricAuthenticating && styles.biometricButtonDisabled,
            ]}>
            <Text style={[styles.biometricButtonText, { color: palette.primary }]}>
              {isBiometricAuthenticating ? 'Vérification…' : 'Utiliser la biométrie'}
            </Text>
          </Pressable>
        ) : null}
        <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.noticeText, { color: palette.textMuted }]}>
            Le PIN, l’activation biométrique et le compteur restent en mémoire pour cette phase ; ils sont
            effacés à la fermeture de l’application.
          </Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 330,
  },
  indicatorBlock: {
    alignItems: 'center',
    marginTop: 48,
  },
  indicatorHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 13,
  },
  blockingStatus: {
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 13,
    maxWidth: 330,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  blockingTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  blockingText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  feedbackSlot: {
    alignItems: 'center',
    minHeight: 50,
    paddingTop: 20,
  },
  feedback: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  bottomContent: {
    alignItems: 'center',
    gap: 18,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  biometricButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 360,
    minHeight: 48,
    paddingHorizontal: 16,
    width: '100%',
  },
  biometricButtonDisabled: {
    opacity: 0.55,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
