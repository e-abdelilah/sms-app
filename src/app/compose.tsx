import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactPicker } from '@/components/contact-picker';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useMockSms } from '@/context/mock-sms-context';

export default function ComposeScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { contacts, getContact, sendMessage } = useMockSms();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const selectedContact = selectedContactId ? getContact(selectedContactId) : undefined;
  const canSend = Boolean(selectedContact && body.trim());

  function sendMockMessage() {
    if (!selectedContact || !body.trim()) return;

    const conversationId = sendMessage({ contactId: selectedContact.id, body });
    router.replace({
      pathname: '/chat/[conversationId]',
      params: { conversationId },
    });
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoider}>
        <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
          <Pressable
            accessibilityLabel="Fermer la composition"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <Text style={[styles.closeLabel, { color: palette.primary }]}>Annuler</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Nouveau message</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.demoBanner, { backgroundColor: palette.primarySoft }]}>
          <Text style={[styles.demoBannerText, { color: palette.text }]}>Simulation locale · aucun SMS ne sera envoyé</Text>
        </View>

        <Text style={[styles.label, { color: palette.textMuted }]}>DESTINATAIRE FICTIF</Text>
        <ContactPicker
          contacts={contacts}
          onSelect={(contact) => setSelectedContactId(contact.id)}
          selectedContactId={selectedContactId}
          style={[styles.contactPicker, { backgroundColor: palette.surface, borderColor: palette.border }]}
        />

        <View style={styles.messageSection}>
          <Text style={[styles.label, { color: palette.textMuted }]}>MESSAGE</Text>
          <TextInput
            accessibilityLabel="Contenu du message fictif"
            multiline
            onChangeText={setBody}
            placeholder="Écrivez votre message…"
            placeholderTextColor={palette.textMuted}
            style={[styles.messageInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            textAlignVertical="top"
            value={body}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSend}
          onPress={sendMockMessage}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: canSend ? palette.primary : palette.surfaceMuted },
            pressed && canSend && styles.pressed,
          ]}>
          <Text style={[styles.sendButtonLabel, { color: canSend ? '#FFFFFF' : palette.textMuted }]}>Simuler l’envoi</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 16,
  },
  closeButton: {
    minWidth: 56,
    paddingVertical: 9,
  },
  closeLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    minWidth: 56,
  },
  demoBanner: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  demoBannerText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.05,
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 20,
  },
  contactPicker: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
    flex: 1,
  },
  messageSection: {
    marginTop: 2,
  },
  messageInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 22,
    marginHorizontal: 16,
    minHeight: 94,
    padding: 13,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    minHeight: 52,
  },
  sendButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.74,
  },
});
