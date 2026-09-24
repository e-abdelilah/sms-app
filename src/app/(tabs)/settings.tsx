import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      {value ? <Text style={[styles.rowValue, { color: palette.primary }]}>{value}</Text> : null}
    </View>
  );
}

type ToggleRowProps = {
  detail: string;
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
};

function ToggleRow({ detail, label, onChange, value }: ToggleRowProps) {
  const palette = getSecureSmsColors(useColorScheme());
  return (
    <View style={[styles.row, { borderBottomColor: palette.border }]}>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
        <Text style={[styles.rowDetail, { color: palette.textMuted }]}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        onValueChange={onChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: palette.surfaceMuted, true: palette.primary }}
        value={value}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { account, lock, sessionExpiresAt, signOut } = useAuth();
  const [deliveryReports, setDeliveryReports] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [notificationPreview, setNotificationPreview] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [rootStatus, setRootStatus] = useState<RootDetectionStatus | 'checking'>('checking');
  const [integrityMessage, setIntegrityMessage] = useState<string | null>(null);
  const [isIntegrityTesting, setIsIntegrityTesting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>Réglages</Text>
          <Text style={[styles.intro, { color: palette.textMuted }]}>Messages, compte et confidentialité</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>COMPTE</Text>
        <View style={[styles.accountCard, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <View style={[styles.accountAvatar, { backgroundColor: palette.primary }]}>
            <Text style={styles.accountAvatarText}>{account?.displayName.charAt(0).toUpperCase() ?? 'S'}</Text>
          </View>
          <View style={styles.accountCopy}>
            <Text style={[styles.accountName, { color: palette.text }]}>{account?.displayName ?? 'SecureSMS'}</Text>
            <Text style={[styles.accountIdentifier, { color: palette.textMuted }]}>{account?.identifier}</Text>
            <Text style={[styles.providerBadge, { color: palette.primary }]}>
              {account?.provider === 'google' ? 'Compte Google' : 'Compte SecureSMS'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            (pressed || isSigningOut) && styles.pressed,
          ]}>
          <Text style={[styles.signOutText, { color: palette.danger }]}>
            {isSigningOut ? 'Déconnexion…' : 'Se déconnecter'}
          </Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>MESSAGES</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Numéro utilisé pour les nouveaux messages" label="SIM préférée" value="SIM 1" />
          <ToggleRow
            detail="Afficher la confirmation de remise"
            label="Accusés de livraison"
            onChange={setDeliveryReports}
            value={deliveryReports}
          />
          <ToggleRow
            detail="Indiquer quand un message a été consulté"
            label="Confirmations de lecture"
            onChange={setReadReceipts}
            value={readReceipts}
          />
          <SettingRow detail="Gérer les numéros et conversations indésirables" label="Contacts bloqués" value="0" />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>NOTIFICATIONS</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <ToggleRow
            detail="Recevoir une alerte pour chaque nouveau message"
            label="Notifications"
            onChange={setNotifications}
            value={notifications}
          />
          <ToggleRow
            detail="Afficher le contenu sur l’écran verrouillé"
            label="Aperçu des messages"
            onChange={setNotificationPreview}
            value={notificationPreview}
          />
          <SettingRow detail="Son utilisé lors de la réception" label="Sonnerie" value="Par défaut" />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>APPARENCE</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Suit le thème clair ou sombre du téléphone" label="Thème" value="Système" />
          <SettingRow detail="Taille du texte des conversations" label="Texte" value="Standard" />
          <SettingRow detail="Couleur principale de l’interface" label="Couleur" value="Indigo" />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>CONFIDENTIALITÉ ET SÉCURITÉ</Text>
        <View style={[styles.securityCard, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>Verrouillage par PIN</Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            {MAX_PIN_FAILED_ATTEMPTS} essais maximum · délai de {retryDelaySeconds} s · blocage de{' '}
            {temporaryLockSeconds} s.
          </Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            Session : {sessionMinutes} min · inactivité : {inactivityMinutes} min · arrière-plan :{' '}
            {backgroundSeconds} s.
          </Text>
          <Text style={[styles.sessionStatus, { color: palette.primary }]}>Expiration prévue : {sessionEndTime}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={lock}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: pressed ? palette.primaryPressed : palette.primary },
            ]}>
            <Text style={styles.primaryButtonText}>Verrouiller maintenant</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.securityList, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Clés protégées par Android Keystore" label="Stockage sécurisé" value="Actif" />
          <SettingRow detail="AES-256-GCM et HMAC-SHA-256" label="Messages protégés" value="Actif" />
          <SettingRow detail="Requêtes SQLite paramétrées" label="Protection SQL" value="Active" />
          <SettingRow detail="État de sécurité de l’appareil" label="Root" value={rootStatusLabel} />
          <SettingRow detail="Sauvegardes et trafic HTTP clair désactivés" label="Hardening Android" value="Actif" />
        </View>

        <View style={[styles.testCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>Vérifier l’intégrité</Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            Modifie un ciphertext de test et vérifie que la lecture est refusée.
          </Text>
          {integrityMessage ? (
            <Text accessibilityLiveRegion="polite" style={[styles.testMessage, { color: palette.textMuted }]}>
              {integrityMessage}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={isIntegrityTesting}
            onPress={() => void handleIntegrityTest()}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: palette.primary },
              (pressed || isIntegrityTesting) && styles.pressed,
            ]}>
            <Text style={[styles.secondaryButtonText, { color: palette.primary }]}>
              {isIntegrityTesting ? 'Vérification…' : 'Lancer le test'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 40 },
  heading: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.9 },
  intro: { fontSize: 14, marginTop: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.15,
    marginBottom: 8,
    marginTop: 26,
    paddingHorizontal: 20,
  },
  card: { borderRadius: 18, borderWidth: 1, marginHorizontal: 20, overflow: 'hidden' },
  accountCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 16,
  },
  accountAvatar: {
    alignItems: 'center',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  accountAvatarText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  accountCopy: { flex: 1, marginLeft: 13 },
  accountName: { fontSize: 17, fontWeight: '900' },
  accountIdentifier: { fontSize: 12, marginTop: 3 },
  providerBadge: { fontSize: 11, fontWeight: '800', marginTop: 5 },
  signOutButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    minHeight: 46,
  },
  signOutText: { fontSize: 14, fontWeight: '900' },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  rowCopy: { flex: 1, gap: 3 },
  rowLabel: { fontSize: 15, fontWeight: '700' },
  rowDetail: { fontSize: 12, lineHeight: 17 },
  rowValue: { fontSize: 12, fontWeight: '800', maxWidth: 92, textAlign: 'right' },
  securityCard: { borderRadius: 18, borderWidth: 1, marginHorizontal: 20, padding: 17 },
  securityList: { marginTop: 12 },
  securityTitle: { fontSize: 16, fontWeight: '900' },
  securityText: { fontSize: 13, lineHeight: 19, marginTop: 7 },
  sessionStatus: { fontSize: 12, fontWeight: '800', marginTop: 10 },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 47,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  testCard: { borderRadius: 18, borderWidth: 1, marginHorizontal: 20, marginTop: 12, padding: 17 },
  testMessage: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 45,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.55 },
});
