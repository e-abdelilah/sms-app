import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinIndicator } from '@/components/pin-indicator';
import { PinKeypad } from '@/components/pin-keypad';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useAuth } from '@/context/auth-context';
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

export default function LockScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { beginEnrollment, confirmEnrollment, isPinConfigured, unlock } = useAuth();
  const [mode, setMode] = useState<LockMode>(isPinConfigured ? 'unlock' : 'create');
  const [entryLength, setEntryLength] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const pinEntryRef = useRef('');

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

      if (unlock(pin).status === 'rejected') {
        setFeedback({ text: 'PIN incorrect. Réessayez.', tone: 'error' });
      }
    },
    [beginEnrollment, clearEntry, confirmEnrollment, mode, unlock],
  );

  const handleDigit = useCallback(
    (digit: string) => {
      const nextPin = `${pinEntryRef.current}${digit}`;

      if (nextPin.length > PIN_LENGTH) return;

      pinEntryRef.current = nextPin;
      setFeedback(null);
      setEntryLength(nextPin.length);

      if (nextPin.length === PIN_LENGTH) {
        submitPin(nextPin);
      }
    },
    [submitPin],
  );

  const handleDelete = useCallback(() => {
    pinEntryRef.current = pinEntryRef.current.slice(0, -1);
    setEntryLength(pinEntryRef.current.length);
    setFeedback(null);
  }, []);

  const copy = screenCopy[mode];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Text style={[styles.badgeText, { color: palette.primary }]}>{copy.stage}</Text>
        </View>

        <Text style={[styles.title, { color: palette.text }]}>{copy.title}</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>{copy.description}</Text>

        <View style={styles.indicatorBlock}>
          <PinIndicator length={entryLength} />
          <Text style={[styles.indicatorHint, { color: palette.textMuted }]}>
            {PIN_LENGTH} chiffres requis
          </Text>
        </View>

        <View accessibilityLiveRegion="polite" style={styles.feedbackSlot}>
          {feedback ? (
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
        <PinKeypad onDelete={handleDelete} onDigit={handleDigit} />
        <View style={[styles.notice, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.noticeText, { color: palette.textMuted }]}>
            Ce PIN reste uniquement en mémoire pour cette phase et sera effacé à la fermeture de l’application.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
