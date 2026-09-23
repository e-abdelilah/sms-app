import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConversationItem } from '@/components/conversation-item';
import { getSecureSmsColors } from '@/constants/secure-sms-theme';
import { useMockSms } from '@/context/mock-sms-context';
import type { Contact, Conversation, Message } from '@/types/sms';

type ConversationRow = {
  contact: Contact;
  conversation: Conversation;
  lastMessage?: Message;
};

export default function ConversationsScreen() {
  const palette = getSecureSmsColors(useColorScheme());
  const { conversations, getContact, getMessages } = useMockSms();

  const rows = conversations.reduce<ConversationRow[]>((items, conversation) => {
    const contact = getContact(conversation.contactId);
    if (!contact) return items;

    const messages = getMessages(conversation.id);
    items.push({
      contact,
      conversation,
      lastMessage: messages[messages.length - 1],
    });
    return items;
  }, []);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.brand, { color: palette.text }]}>SecureSMS</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>Vos conversations</Text>
        </View>
        <Pressable
          accessibilityLabel="Ouvrir les réglages"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.headerAction,
            { backgroundColor: palette.primarySoft },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.headerActionText, { color: palette.primary }]}>•••</Text>
        </Pressable>
      </View>

      <View style={[styles.localOnlyNote, { backgroundColor: palette.primarySoft }]}> 
        <View style={[styles.noteDot, { backgroundColor: palette.primary }]} />
        <Text style={[styles.noteText, { color: palette.text }]}>Données fictives · Aucun SMS réel n’est envoyé</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={rows}
        keyExtractor={(item) => item.conversation.id}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>CONVERSATIONS RÉCENTES</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>Aucune conversation</Text>
            <Text style={[styles.emptyBody, { color: palette.textMuted }]}>Créez un message fictif pour commencer.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ConversationItem
            contact={item.contact}
            conversation={item.conversation}
            lastMessage={item.lastMessage}
            onPress={() =>
              router.push({
                pathname: '/chat/[conversationId]',
                params: { conversationId: item.conversation.id },
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        accessibilityLabel="Créer un nouveau message"
        accessibilityRole="button"
        onPress={() => router.push('/compose')}
        style={({ pressed }) => [
          styles.composeButton,
          { backgroundColor: palette.primary, shadowColor: palette.text },
          pressed && styles.composeButtonPressed,
        ]}>
        <Text style={styles.composePlus}>+</Text>
        <Text style={styles.composeLabel}>Nouveau message</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerAction: {
    alignItems: 'center',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerActionText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -6,
  },
  pressed: {
    opacity: 0.72,
  },
  localOnlyNote: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 108,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    paddingBottom: 7,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 76,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  composeButton: {
    alignItems: 'center',
    borderRadius: 28,
    bottom: 20,
    elevation: 5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    position: 'absolute',
    right: 20,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
  },
  composeButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  composePlus: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 23,
  },
  composeLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
