import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinReauthenticationModal } from '@/components/pin-reauthentication-modal';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useAuth } from '@/context/auth-context';
import {
  getDurationInSeconds,
  MAX_PIN_FAILED_ATTEMPTS,
  PIN_RETRY_DELAY_MS,
  TEMPORARY_PIN_LOCK_MS,
} from '@/security/pin-attempt-policy';
import {
  BACKGROUND_LOCK_DELAY_MS,
  getDurationInMinutes,
  getDurationInSeconds as getSessionDurationInSeconds,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_MAX_DURATION_MS,
} from '@/security/session-policy';
import { detectRootStatus, type RootDetectionStatus } from '@/security/root-detection-service';
import { runIntegrityTamperTest } from '@/security/security-self-test';

type SettingRowProps = {
  detail: string;
  label: string;
  value?: string;
};

function SettingRow({ detail, label, value }: SettingRowProps) {
  const palette = getSecureSmsColors(useColorScheme());

  return (
    <View style={[styles.row, { borderBottomColor: palette.border }]}>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.rowDetail, { color: palette.textMuted }]}>{detail}</Text>
      </View>
      {value ? <Text style={[styles.rowValue, { color: palette.textMuted }]}>{value}</Text> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { disableBiometrics, enableBiometrics, isBiometricEnabled, lock, sessionExpiresAt } = useAuth();
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);
  const [isBiometricWorking, setIsBiometricWorking] = useState(false);
  const [pendingBiometricAction, setPendingBiometricAction] = useState<'enable' | 'disable' | null>(null);
  const [rootStatus, setRootStatus] = useState<RootDetectionStatus | 'checking'>('checking');
  const [integrityMessage, setIntegrityMessage] = useState<string | null>(null);
  const [isIntegrityTesting, setIsIntegrityTesting] = useState(false);
  const retryDelaySeconds = getDurationInSeconds(PIN_RETRY_DELAY_MS);
  const temporaryLockSeconds = getDurationInSeconds(TEMPORARY_PIN_LOCK_MS);
  const sessionMinutes = getDurationInMinutes(SESSION_MAX_DURATION_MS);
  const inactivityMinutes = getDurationInMinutes(SESSION_INACTIVITY_TIMEOUT_MS);
  const backgroundSeconds = getSessionDurationInSeconds(BACKGROUND_LOCK_DELAY_MS);
  const sessionEndTime = sessionExpiresAt
    ? new Date(sessionExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Verrouillée';
  const rootStatusLabel =
    rootStatus === 'checking'
      ? 'Analyse…'
      : rootStatus === 'detected'
        ? 'Risque détecté'
        : rootStatus === 'not-detected'
          ? 'Non détecté'
          : 'Indisponible';

  useEffect(() => {
    let active = true;
    void detectRootStatus().then((status) => {
      if (active) setRootStatus(status);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleIntegrityTest() {
    if (isIntegrityTesting) return;
    setIsIntegrityTesting(true);
    setIntegrityMessage(null);

    try {
      const wasDetected = await runIntegrityTamperTest();
      setIntegrityMessage(
        wasDetected
          ? 'Altération détectée : le contenu modifié a été refusé.'
          : 'Le test d’intégrité a échoué.',
      );
    } catch {
      setIntegrityMessage('Test indisponible sur cet environnement.');
    } finally {
      setIsIntegrityTesting(false);
    }
  }

  function handleBiometricPress() {
    setBiometricMessage(null);
    setPendingBiometricAction(isBiometricEnabled ? 'disable' : 'enable');
  }

  async function handleBiometricReauthenticated() {
    const action = pendingBiometricAction;
    setPendingBiometricAction(null);

    if (!action) return;

    if (action === 'disable') {
      disableBiometrics();
      setBiometricMessage('Biométrie désactivée.');
      return;
    }

    setIsBiometricWorking(true);
    const result = await enableBiometrics();
    setIsBiometricWorking(false);

    switch (result.status) {
      case 'authenticated':
        setBiometricMessage('Biométrie activée pour le déverrouillage.');
        return;
      case 'cancelled':
        setBiometricMessage('Activation biométrique annulée.');
        return;
      case 'locked-out':
        setBiometricMessage('Biométrie temporairement verrouillée par Android.');
        return;
      case 'not-enrolled':
        setBiometricMessage('Enregistrez d’abord une empreinte ou un visage dans Android.');
        return;
      case 'unavailable':
        setBiometricMessage('Biométrie indisponible sur cet appareil.');
        return;
      default:
        setBiometricMessage('Échec de l’authentification biométrique.');
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>Réglages</Text>
          <Text style={[styles.intro, { color: palette.textMuted }]}>Sécurité et confidentialité</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>APPLICATION</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Messagerie locale sécurisée" label="SecureSMS" value="1.0" />
          <SettingRow detail="Android est la plateforme cible" label="Plateforme" value="Android" />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>SÉCURITÉ</Text>
        <View style={[styles.securityCard, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>PIN et anti-brute-force actifs</Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            Après chaque PIN incorrect, un délai de {retryDelaySeconds} seconde est appliqué. Au{' '}
            {MAX_PIN_FAILED_ATTEMPTS}e échec, l’accès est verrouillé pendant {temporaryLockSeconds} secondes.
          </Text>
          <Pressable
            accessibilityLabel="Verrouiller l’application"
            accessibilityRole="button"
            onPress={lock}
            style={({ pressed }) => [
              styles.lockButton,
              { backgroundColor: pressed ? palette.primaryPressed : palette.primary },
            ]}>
            <Text style={[styles.lockButtonText, { color: palette.sentBubbleText }]}>Verrouiller l’application</Text>
          </Pressable>
        </View>
        <View style={[styles.biometricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>Session locale protégée</Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            Expiration absolue : {sessionMinutes} min · Inactivité : {inactivityMinutes} min · Arrière-plan :{' '}
            {backgroundSeconds} s.
          </Text>
          <Text style={[styles.sessionStatus, { color: palette.primary }]}>Expiration prévue : {sessionEndTime}</Text>
        </View>
        <View style={[styles.biometricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>Biométrie Android</Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            {isBiometricEnabled
              ? 'Activée comme méthode de déverrouillage.'
              : 'Désactivée. Activez-la après avoir confirmé votre identité.'}
          </Text>
          {biometricMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.biometricMessage, { color: palette.textMuted }]}>
              {biometricMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel={isBiometricEnabled ? 'Désactiver la biométrie' : 'Activer la biométrie'}
            accessibilityRole="button"
            disabled={isBiometricWorking}
            onPress={() => void handleBiometricPress()}
            style={({ pressed }) => [
              styles.lockButton,
              { backgroundColor: pressed ? palette.primaryPressed : palette.primary },
              isBiometricWorking && styles.actionDisabled,
            ]}>
            <Text style={[styles.lockButtonText, { color: palette.sentBubbleText }]}>
              {isBiometricWorking
                ? 'Vérification…'
                : isBiometricEnabled
                  ? 'Désactiver la biométrie'
                  : 'Activer la biométrie'}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>CENTRE DE SÉCURITÉ</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Requêtes SQLite avec paramètres liés" label="Anti SQL Injection" value="Actif" />
          <SettingRow detail="Clés secrètes hors du code source" label="Android Keystore" value="Actif" />
          <SettingRow detail="AES-256-GCM avant écriture SQLite" label="Chiffrement" value="Actif" />
          <SettingRow detail="HMAC-SHA-256 vérifié avant déchiffrement" label="Intégrité" value="Actif" />
          <SettingRow detail="Valeurs sensibles masquées, aucun log en production" label="Logs sensibles" value="Désactivés" />
          <SettingRow detail="SMS, contacts et journaux d’appels bloqués" label="Permissions" value="Minimales" />
          <SettingRow detail="Sauvegarde Android désactivée" label="Backups" value="Protégés" />
          <SettingRow detail="Contrôle expérimental, contournable" label="Root" value={rootStatusLabel} />
          <SettingRow detail="R8, shrink resources et HTTP clair désactivé" label="Hardening" value="Release" />
          <SettingRow detail="Profils EAS preview et production configurés" label="Signature APK" value="À générer" />
        </View>

        <View style={[styles.pendingCard, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Text style={[styles.pendingTitle, { color: palette.text }]}>Test d’intégrité pédagogique</Text>
          <Text style={[styles.pendingText, { color: palette.textMuted }]}>
            Le test chiffre un message, modifie son ciphertext puis vérifie que le HMAC bloque la lecture.
          </Text>
          {integrityMessage ? (
            <Text accessibilityLiveRegion="polite" style={[styles.biometricMessage, { color: palette.textMuted }]}>
              {integrityMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={isIntegrityTesting}
            onPress={() => void handleIntegrityTest()}
            style={({ pressed }) => [
              styles.lockButton,
              { backgroundColor: pressed ? palette.primaryPressed : palette.primary },
              isIntegrityTesting && styles.actionDisabled,
            ]}>
            <Text style={[styles.lockButtonText, { color: palette.sentBubbleText }]}>
              {isIntegrityTesting ? 'Test…' : 'Simuler une altération'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      <PinReauthenticationModal
        actionLabel={pendingBiometricAction === 'disable' ? 'désactiver la biométrie' : 'activer la biométrie'}
        onAuthenticated={() => void handleBiometricReauthenticated()}
        onCancel={() => setPendingBiometricAction(null)}
        visible={pendingBiometricAction !== null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  heading: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  intro: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 28,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  securityCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 16,
  },
  biometricCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
  },
  biometricMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  sessionStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  securityText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  lockButton: {
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 16,
    minHeight: 45,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  lockButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  pendingCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  pendingText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
});
