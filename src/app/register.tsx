import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, type AccountProfile } from '@/context/auth-context';

type AuthMode = 'google' | 'menu' | 'signin' | 'signup';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatNameFromEmail(email: string) {
  const prefix = email.split('@')[0] ?? 'Utilisateur';
  const normalized = prefix.replace(/[._-]+/g, ' ').trim();
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Utilisateur';
}

export default function RegisterScreen() {
  const { registerAccount } = useAuth();
  const [mode, setMode] = useState<AuthMode>('menu');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openMode(nextMode: Exclude<AuthMode, 'menu'>) {
    setMode(nextMode);
    setDisplayName('');
    setEmail('');
    setFeedback(null);
  }

  function goBack() {
    setMode('menu');
    setDisplayName('');
    setEmail('');
    setFeedback(null);
  }

  async function handleContinue() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setFeedback('Entrez une adresse e-mail valide.');
      return;
    }

    const normalizedName = displayName.trim() || formatNameFromEmail(normalizedEmail);
    if (mode === 'signup' && normalizedName.length < 2) {
      setFeedback('Entrez votre nom.');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const account: AccountProfile = {
        displayName: normalizedName,
        identifier: normalizedEmail,
        provider: mode === 'google' ? 'google' : 'email',
      };
      await registerAccount(account);
    } catch {
      setFeedback('Impossible de continuer. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const formTitle =
    mode === 'signup'
      ? 'Créer un compte'
      : mode === 'signin'
        ? 'Se connecter'
        : 'Continuer avec Google';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.brand}>SecureSMS</Text>
            <Text style={styles.subtitle}>Vos messages, simplement protégés.</Text>
          </View>

          {mode === 'menu' ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openMode('signup')}
                style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                <Text style={styles.outlineButtonText}>S’inscrire</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => openMode('signin')}
                style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                <Text style={styles.outlineButtonText}>Se connecter</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => openMode('google')}
                style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
                <Text style={styles.googleMark}>G</Text>
                <Text style={styles.googleButtonText}>Se connecter avec Google</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Pressable accessibilityRole="button" hitSlop={10} onPress={goBack}>
                <Text style={styles.backText}>‹ Retour</Text>
              </Pressable>
              <Text style={styles.formTitle}>{formTitle}</Text>
              <Text style={styles.formSubtitle}>Vous créerez votre PIN de sécurité à l’étape suivante.</Text>

              {mode === 'signup' ? (
                <>
                  <Text style={styles.label}>NOM</Text>
                  <TextInput
                    autoCapitalize="words"
                    maxLength={40}
                    onChangeText={setDisplayName}
                    placeholder="Votre nom"
                    placeholderTextColor="#8492AE"
                    style={styles.input}
                    value={displayName}
                  />
                </>
              ) : null}

              <Text style={[styles.label, mode === 'signup' && styles.labelSpacing]}>ADRESSE E-MAIL</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder={mode === 'google' ? 'nom@gmail.com' : 'nom@exemple.com'}
                placeholderTextColor="#8492AE"
                style={styles.input}
                value={email}
              />

              <View style={styles.feedbackSlot}>
                {feedback ? (
                  <Text accessibilityLiveRegion="polite" style={styles.feedback}>
                    {feedback}
                  </Text>
                ) : null}
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => void handleContinue()}
                style={({ pressed }) => [
                  styles.continueButton,
                  (pressed || isSubmitting) && styles.pressed,
                ]}>
                <Text style={styles.continueText}>{isSubmitting ? 'Connexion…' : 'Continuer'}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#6094E8', flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 36,
  },
  brandBlock: { alignItems: 'center', marginBottom: 42 },
  logo: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    height: 72,
    justifyContent: 'center',
    marginBottom: 17,
    shadowColor: '#17365F',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    width: 72,
  },
  logoText: { color: '#426FC1', fontSize: 34, fontWeight: '900' },
  brand: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: '#EAF2FF', fontSize: 14, marginTop: 6 },
  actions: { alignSelf: 'center', gap: 12, maxWidth: 360, width: '100%' },
  outlineButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 52,
  },
  outlineButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  googleMark: { color: '#4285F4', fontSize: 20, fontWeight: '900', marginRight: 12 },
  googleButtonText: { color: '#27344A', fontSize: 15, fontWeight: '700' },
  formCard: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    maxWidth: 390,
    padding: 22,
    width: '100%',
  },
  backText: { color: '#426FC1', fontSize: 14, fontWeight: '800' },
  formTitle: { color: '#17223A', fontSize: 25, fontWeight: '900', marginTop: 18 },
  formSubtitle: { color: '#66728A', fontSize: 13, lineHeight: 19, marginBottom: 24, marginTop: 7 },
  label: { color: '#66728A', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 8 },
  labelSpacing: { marginTop: 17 },
  input: {
    borderColor: '#D8E0EC',
    borderRadius: 12,
    borderWidth: 1,
    color: '#17223A',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  feedbackSlot: { minHeight: 40, paddingTop: 9 },
  feedback: { color: '#B42318', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  continueButton: {
    alignItems: 'center',
    backgroundColor: '#426FC1',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 52,
  },
  continueText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
