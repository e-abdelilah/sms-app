import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/message-bubble';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useMockSms } from '@/context/mock-sms-context';

function formatConversationDay(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Aujourd’hui';

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export default function ChatScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const selectedConversationId = Array.isArray(conversationId) ? conversationId[0] : conversationId;
  const { getContact, getConversation, getMessages } = useMockSms();
  const conversation = selectedConversationId ? getConversation(selectedConversationId) : undefined;
  const contact = conversation ? getContact(conversation.contactId) : undefined;
  const messages = conversation ? getMessages(conversation.id) : [];

  if (!conversation || !contact) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, styles.centered, { backgroundColor: palette.background }]}>
        <Text style={[styles.unavailableTitle, { color: palette.text }]}>Conversation indisponible</Text>
        <Text style={[styles.unavailableText, { color: palette.textMuted }]}>Cette conversation n’est plus disponible.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={[styles.backToMessages, { backgroundColor: palette.primary }]}>
          <Text style={styles.backToMessagesLabel}>Voir les conversations</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Pressable
          accessibilityLabel="Retour aux conversations"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={[styles.backChevron, { color: palette.primary }]}>‹</Text>
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
          <Text style={styles.avatarText}>{contact.initials}</Text>
        </View>
        <View style={styles.contactCopy}>
          <Text numberOfLines={1} style={[styles.contactName, { color: palette.text }]}>
            {contact.displayName}
          </Text>
          <Text numberOfLines={1} style={[styles.contactNumber, { color: palette.textMuted }]}>
            {contact.phoneNumber}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.dayPill, { backgroundColor: palette.primarySoft }]}>
          <Text style={[styles.dayLabel, { color: palette.textMuted }]}>{formatConversationDay(messages[0]?.sentAt ?? conversation.lastMessageAt)}</Text>
        </View>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: palette.surface, borderTopColor: palette.border }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/compose')}
          style={({ pressed }) => [styles.composeButton, { backgroundColor: palette.primary }, pressed && styles.pressed]}>
          <Text style={styles.composeButtonLabel}>Écrire un message</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  unavailableText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  backToMessages: {
    borderRadius: 14,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backToMessagesLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 14,
  },
  backButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    marginRight: 3,
    width: 32,
  },
  backChevron: {
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -3,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  contactCopy: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '800',
  },
  contactNumber: {
    fontSize: 12,
    marginTop: 2,
  },
  messagesContent: {
    paddingBottom: 18,
    paddingTop: 16,
  },
  dayPill: {
    alignSelf: 'center',
    borderRadius: 12,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  composeButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 0,
    minHeight: 48,
  },
  composeButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
});
