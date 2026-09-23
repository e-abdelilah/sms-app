import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Message } from '@/types/sms';

export type MessageBubbleProps = {
  message: Message;
  style?: StyleProp<ViewStyle>;
};

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function deliveryLabel(status: Message['status']) {
  switch (status) {
    case 'read':
      return 'Lu';
    case 'delivered':
      return 'Distribué';
    default:
      return 'Envoyé';
  }
}

export function MessageBubble({ message, style }: MessageBubbleProps) {
  const theme = useTheme();
  const isOutgoing = message.direction === 'outgoing';
  const bubbleColor = isOutgoing ? '#156E4A' : theme.backgroundElement;
  const textColor = isOutgoing ? '#FFFFFF' : theme.text;
  const metadataColor = isOutgoing ? '#D4F5E5' : theme.textSecondary;

  return (
    <View
      accessibilityLabel={`${isOutgoing ? 'Message envoyé' : 'Message reçu'} à ${formatTime(
        message.sentAt,
      )}`}
      style={[styles.wrapper, isOutgoing ? styles.outgoingWrapper : styles.incomingWrapper, style]}>
      <View style={[styles.bubble, { backgroundColor: bubbleColor }, isOutgoing && styles.outgoingBubble]}>
        <Text selectable style={[styles.body, { color: textColor }]}>
          {message.body}
        </Text>
        <View style={styles.metadata}>
          <Text style={[styles.time, { color: metadataColor }]}>{formatTime(message.sentAt)}</Text>
          {isOutgoing ? (
            <Text accessibilityLabel={deliveryLabel(message.status)} style={[styles.status, { color: metadataColor }]}>
              {message.status === 'sent' ? '✓' : '✓✓'}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 3,
  },
  incomingWrapper: {
    justifyContent: 'flex-start',
  },
  outgoingWrapper: {
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: 18,
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 6,
  },
  outgoingBubble: {
    borderBottomRightRadius: 4,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  metadata: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  time: {
    fontSize: 11,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -2,
  },
});
