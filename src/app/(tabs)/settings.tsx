import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useAuth } from '@/context/auth-context';

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
  const { lock } = useAuth();

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>Réglages</Text>
          <Text style={[styles.intro, { color: palette.textMuted }]}>Prototype universitaire hors ligne</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>APPLICATION</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Application SMS pédagogique" label="SecureSMS" value="1.0" />
          <SettingRow detail="Android est la plateforme cible" label="Plateforme" value="Android" />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>DONNÉES</Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <SettingRow detail="Contacts et conversations de démonstration" label="Contenu" value="Local" />
          <SettingRow detail="Aucun serveur, API distante ou envoi de SMS" label="Communication" value="Désactivée" />
        </View>

        <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>SÉCURITÉ</Text>
        <View style={[styles.securityCard, { backgroundColor: palette.primarySoft, borderColor: palette.border }]}>
          <Text style={[styles.securityTitle, { color: palette.text }]}>Verrouillage PIN actif</Text>
          <Text style={[styles.securityText, { color: palette.textMuted }]}>
            Le PIN protège l’accès à cette session de démonstration. Sa persistance sécurisée sera ajoutée
            dans une phase ultérieure.
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
        <View style={[styles.pendingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.pendingTitle, { color: palette.text }]}>Protections à venir</Text>
          <Text style={[styles.pendingText, { color: palette.textMuted }]}>
            Biométrie, chiffrement, contrôles d’intégrité et limitation des tentatives seront ajoutés dans
            leurs phases dédiées.
          </Text>
        </View>
      </ScrollView>
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
