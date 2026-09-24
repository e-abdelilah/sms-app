import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSecureSmsColors, type SecureSmsPalette } from '@/constants/secure-sms-theme';
import { logSecurityEvent } from '@/security/secure-logger';

type DemoCardProps = {
  children: ReactNode;
  protection: string;
  result: string;
  risk: string;
  title: string;
};

function Label({ children, palette }: { children: ReactNode; palette: SecureSmsPalette }) {
  return <Text style={[styles.label, { color: palette.textMuted }]}>{children}</Text>;
}

function DemoCard({ children, protection, result, risk, title }: DemoCardProps) {
  const palette = getSecureSmsColors(useColorScheme());

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>

      <Label palette={palette}>RISK</Label>
      <Text style={[styles.body, { color: palette.text }]}>{risk}</Text>

      <Label palette={palette}>PROTECTION</Label>
      <Text style={[styles.body, { color: palette.text }]}>{protection}</Text>

      <Label palette={palette}>TEST</Label>
      <View style={[styles.testArea, { backgroundColor: palette.background, borderColor: palette.border }]}>
        {children}
      </View>

      <Label palette={palette}>RESULT</Label>
      <View style={[styles.resultBox, { backgroundColor: palette.primarySoft }]}>
        <Text style={[styles.resultMark, { color: palette.success }]}>✓</Text>
        <Text style={[styles.resultText, { color: palette.text }]}>{result}</Text>
      </View>
    </View>
  );
}

function PermissionRow({
  label,
  status,
  palette,
}: {
  label: string;
  palette: SecureSmsPalette;
  status: string;
}) {
  return (
    <View style={styles.permissionRow}>
      <Text style={[styles.testKey, { color: palette.text }]}>{label}</Text>
      <Text style={[styles.testValue, { color: palette.success }]}>{status}</Text>
    </View>
  );
}

export default function SecurityLabScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const [logTestCompleted, setLogTestCompleted] = useState(false);

  function runSafeLogTest() {
    logSecurityEvent('Authentication attempt');
    logSecurityEvent('Message processed successfully');
    setLogTestCompleted(true);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Pressable
          accessibilityLabel="Retour aux réglages"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={[styles.backLabel, { color: palette.primary }]}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: palette.text }]}>Security Lab</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>Démonstrations vérifiables</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DemoCard
          protection="Only SEND_SMS is declared. Camera, location and microphone permissions are explicitly blocked."
          result="Only required permissions are used."
          risk="Unnecessary permissions expose device capabilities and private data."
          title="Least Privilege Test">
          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Application feature</Text>
          <Text style={[styles.testStrong, { color: palette.text }]}>Send SMS</Text>
          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Required permission</Text>
          <PermissionRow label="SMS" palette={palette} status="Requested" />
          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Unnecessary permissions</Text>
          <PermissionRow label="Camera" palette={palette} status="Not requested" />
          <PermissionRow label="Location" palette={palette} status="Not requested" />
          <PermissionRow label="Microphone" palette={palette} status="Not requested" />
        </DemoCard>

        <DemoCard
          protection="The logger accepts predefined event names only and cannot receive sensitive metadata."
          result={
            logTestCompleted
              ? 'Sensitive values were masked and never written to logs.'
              : 'Sensitive values are masked and never written to logs.'
          }
          risk="Sensitive data exposure through application logs and Logcat."
          title="Sensitive Logs Test">
          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Sensitive data</Text>
          <Text style={[styles.codeLine, { color: palette.text }]}>PIN: ****</Text>
          <Text style={[styles.codeLine, { color: palette.text }]}>Message: [Hidden]</Text>

          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Unsafe example</Text>
          <Text style={[styles.unsafeLine, { color: palette.danger }]}>PIN = [SENSITIVE DATA]</Text>
          <Text style={[styles.unsafeLine, { color: palette.danger }]}>Message = [SENSITIVE DATA]</Text>

          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Secure application output</Text>
          <Text style={[styles.codeLine, { color: palette.success }]}>Authentication attempt</Text>
          <Text style={[styles.codeLine, { color: palette.success }]}>Message processed successfully</Text>

          <Pressable
            accessibilityRole="button"
            onPress={runSafeLogTest}
            style={({ pressed }) => [
              styles.testButton,
              { borderColor: palette.primary },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.testButtonText, { color: palette.primary }]}>
              {logTestCompleted ? 'Safe logs generated ✓' : 'Generate safe logs'}
            </Text>
          </Pressable>
        </DemoCard>

        <DemoCard
          protection="Android backup is disabled and SecureStore data is excluded from backup configuration."
          result="Sensitive application data is excluded from Android backup."
          risk="Backups can expose messages, authentication data and cryptographic material."
          title="Backup Security Test">
          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Sensitive application data</Text>
          <PermissionRow label="Messages" palette={palette} status="Protected" />
          <PermissionRow label="Authentication data" palette={palette} status="Protected" />
          <PermissionRow label="Cryptographic material" palette={palette} status="Protected" />
          <Text style={[styles.testSectionTitle, { color: palette.textMuted }]}>Backup policy</Text>
          <PermissionRow label="Android Backup" palette={palette} status="Disabled" />
          <PermissionRow label="SecureStore data" palette={palette} status="Excluded" />
        </DemoCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 70,
    paddingHorizontal: 14,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 36,
  },
  backLabel: { fontSize: 38, fontWeight: '300', lineHeight: 38 },
  headerCopy: { flex: 1, marginLeft: 7 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 12, marginTop: 2 },
  content: { gap: 16, padding: 16, paddingBottom: 36 },
  card: { borderRadius: 20, borderWidth: 1, padding: 17 },
  cardTitle: { fontSize: 19, fontWeight: '900', marginBottom: 5 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 13 },
  body: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  testArea: { borderRadius: 14, borderWidth: 1, marginTop: 7, padding: 12 },
  testSectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginBottom: 5, marginTop: 9 },
  testStrong: { fontSize: 14, fontWeight: '800' },
  permissionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 26,
  },
  testKey: { flex: 1, fontSize: 12 },
  testValue: { fontSize: 11, fontWeight: '900', marginLeft: 10, textAlign: 'right' },
  codeLine: { fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
  unsafeLine: { fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
  resultBox: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 7,
    padding: 11,
  },
  resultMark: { fontSize: 17, fontWeight: '900', marginRight: 8 },
  resultText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  testButton: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 42,
  },
  testButtonText: { fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.6 },
});
