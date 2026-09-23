import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Contact, Conversation, Message } from '@/types/sms';
import { useTheme } from '@/hooks/use-theme';

export type ConversationItemProps = {
  conversation: Conversation;
  contact: Contact;
  lastMessage?: Message;
  onPress?: (conversation: Conversation) => void;
  style?: StyleProp<ViewStyle>;
};

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function ConversationItem({
  conversation,
  contact,
  lastMessage,
  onPress,
  style,
}: ConversationItemProps) {
  const theme = useTheme();
  const preview = lastMessage?.body ?? 'Aucun message';
  const timestamp = lastMessage?.sentAt ?? conversation.lastMessageAt;

  return (
    <Pressable
      accessibilityLabel={`Conversation avec ${contact.displayName}`}
      accessibilityRole="button"
      onPress={() => onPress?.(conversation)}
      style={({ pressed }) => [
        styles.container,
        { borderBottomColor: theme.backgroundElement },
        pressed && styles.pressed,
        style,
      ]}>
      <View style={[styles.avatar, { backgroundColor: contact.avatarColor }]}>
        <Text style={styles.avatarText}>{contact.initials}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
            {contact.displayName}
          </Text>
          <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{formatTimestamp(timestamp)}</Text>
        </View>

        <View style={styles.previewRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.preview,
              { color: conversation.unreadCount > 0 ? theme.text : theme.textSecondary },
              conversation.unreadCount > 0 && styles.unreadPreview,
            ]}>
            {lastMessage?.direction === 'outgoing' ? `Vous : ${preview}` : preview}
          </Text>
          {conversation.unreadCount > 0 ? (
            <View accessibilityLabel={`${conversation.unreadCount} message(s) non lu(s)`} style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{conversation.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 14,
  },
  unreadPreview: {
    fontWeight: '700',
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#156E4A',
    borderRadius: 10,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
