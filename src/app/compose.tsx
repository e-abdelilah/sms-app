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
import {
  MAX_PHONE_INPUT_LENGTH,
  MESSAGE_MAX_LENGTH,
  normalizePhoneNumber,
  validateMessageBody,
  validatePhoneNumber,
} from '@/security/input-validation';
import type { Contact } from '@/types/sms';

export default function ComposeScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { contacts, getContact, sendMessage } = useMockSms();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [recipientPhoneNumber, setRecipientPhoneNumber] = useState('');
  const [recipientTouched, setRecipientTouched] = useState(false);
  const [messageTouched, setMessageTouched] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedContact = selectedContactId ? getContact(selectedContactId) : undefined;
  const phoneValidation = validatePhoneNumber(recipientPhoneNumber);
  const messageValidation = validateMessageBody(body);
  const recipientError = !selectedContact
    ? 'Sélectionnez un contact.'
    : !phoneValidation.isValid
      ? phoneValidation.error
      : phoneValidation.value !== normalizePhoneNumber(selectedContact.phoneNumber)
        ? 'Le numéro ne correspond pas au contact sélectionné.'
        : null;
  const messageError = messageValidation.isValid ? null : messageValidation.error;
  const canSend = recipientError === null && messageValidation.isValid;

  function handleContactSelect(contact: Contact) {
    setSelectedContactId(contact.id);
    setRecipientPhoneNumber(contact.phoneNumber);
    setRecipientTouched(false);
    setSubmissionError(null);
  }

  function handleRecipientChange(value: string) {
    setRecipientPhoneNumber(value);
    if (isSubmitting) return;

    setRecipientTouched(true);
    setSubmissionError(null);
  }

  function handleBodyChange(value: string) {
    setBody(value);
    setMessageTouched(true);
    setSubmissionError(null);
  }

  async function handleSendMessage() {
    setRecipientTouched(true);
    setMessageTouched(true);
    setSubmissionError(null);

    if (!selectedContact || recipientError || !phoneValidation.isValid || !messageValidation.isValid) return;

    setIsSubmitting(true);
    try {
      const conversationId = await sendMessage({
        contactId: selectedContact.id,
        body: messageValidation.value,
        recipientPhoneNumber: phoneValidation.value,
      });
      router.replace({
        pathname: '/chat/[conversationId]',
        params: { conversationId },
      });
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Le message n’a pas pu être validé.');
    } finally {
      setIsSubmitting(false);
    }
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

        <Text style={[styles.label, { color: palette.textMuted }]}>DESTINATAIRE</Text>
        <ContactPicker
          contacts={contacts}
          onSelect={handleContactSelect}
          selectedContactId={selectedContactId}
          style={[styles.contactPicker, { backgroundColor: palette.surface, borderColor: palette.border }]}
        />

        <View style={styles.recipientSection}>
          <Text style={[styles.label, { color: palette.textMuted }]}>NUMÉRO DU DESTINATAIRE</Text>
          <TextInput
            accessibilityLabel="Numéro du destinataire"
            keyboardType="phone-pad"
            maxLength={MAX_PHONE_INPUT_LENGTH}
            onBlur={() => setRecipientTouched(true)}
            onChangeText={handleRecipientChange}
            placeholder="+212 6 12 34 56 78"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.recipientInput,
              {
                backgroundColor: palette.surface,
                borderColor: recipientTouched && recipientError ? palette.danger : palette.border,
                color: palette.text,
              },
            ]}
            value={recipientPhoneNumber}
          />
          {recipientTouched && recipientError ? (
            <Text accessibilityLiveRegion="polite" style={[styles.errorText, { color: palette.danger }]}>
              {recipientError}
            </Text>
          ) : null}
        </View>

        <View style={styles.messageSection}>
          <Text style={[styles.label, { color: palette.textMuted }]}>MESSAGE</Text>
          <TextInput
            accessibilityLabel="Contenu du message"
            maxLength={MESSAGE_MAX_LENGTH + 1}
            multiline
            onBlur={() => setMessageTouched(true)}
            onChangeText={handleBodyChange}
            placeholder="Écrivez votre message…"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.messageInput,
              {
                backgroundColor: palette.surface,
                borderColor: messageTouched && messageError ? palette.danger : palette.border,
                color: palette.text,
              },
            ]}
            textAlignVertical="top"
            value={body}
          />
          <View style={styles.messageMeta}>
            <Text style={[styles.helperText, { color: palette.textMuted }]}>Espaces seuls refusés</Text>
            <Text
              accessibilityLabel={`${body.length} caractères sur ${MESSAGE_MAX_LENGTH}`}
              style={[styles.counterText, { color: body.length > MESSAGE_MAX_LENGTH ? palette.danger : palette.textMuted }]}>
              {body.length} / {MESSAGE_MAX_LENGTH}
            </Text>
          </View>
          {messageTouched && messageError ? (
            <Text accessibilityLiveRegion="polite" style={[styles.errorText, { color: palette.danger }]}>
              {messageError}
            </Text>
          ) : null}
        </View>

        {submissionError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.submissionError, { color: palette.danger }]}>
            {submissionError}
          </Text>
        ) : null}

        <Pressable
          accessibilityHint="Valide le destinataire et le contenu avant l’envoi"
          disabled={isSubmitting}
          accessibilityRole="button"
          onPress={handleSendMessage}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: canSend ? palette.primary : palette.surfaceMuted },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.sendButtonLabel, { color: canSend ? '#FFFFFF' : palette.textMuted }]}>
            {isSubmitting ? 'Protection…' : 'Envoyer'}
          </Text>
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
  recipientSection: {
    marginTop: 2,
  },
  recipientInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    marginHorizontal: 16,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
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
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 7,
  },
  helperText: {
    fontSize: 11,
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: 6,
  },
  submissionError: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: 10,
    textAlign: 'center',
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
