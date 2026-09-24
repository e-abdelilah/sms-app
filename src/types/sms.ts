/**
 * Domain models used by the SecureSMS messaging application.
 *
 * Dates are ISO-8601 UTC strings so they stay serializable when a persistence
 * layer is introduced in a later phase.
 */

export type MessageDirection = 'incoming' | 'outgoing';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export type Contact = {
  id: string;
  displayName: string;
  phoneNumber: string;
  initials: string;
  avatarColor: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  direction: MessageDirection;
  status: MessageStatus;
  sentAt: string;
  integrityStatus?: 'valid' | 'invalid';
};

export type Conversation = {
  id: string;
  contactId: string;
  lastMessageId: string;
  lastMessageAt: string;
  unreadCount: number;
};
