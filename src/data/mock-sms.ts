import type { Contact, Conversation, Message } from '@/types/sms';

export const mockContacts: readonly Contact[] = [
  {
    id: 'contact-abdelilah',
    displayName: 'Abdelilah',
    phoneNumber: '+212 6 12 34 56 78',
    initials: 'A',
    avatarColor: '#3448D4',
  },
  {
    id: 'contact-mehdi',
    displayName: 'Mehdi',
    phoneNumber: '+212 6 23 45 67 89',
    initials: 'M',
    avatarColor: '#0F766E',
  },
  {
    id: 'contact-yassine',
    displayName: 'Yassine',
    phoneNumber: '+212 6 34 56 78 90',
    initials: 'Y',
    avatarColor: '#B45309',
  },
  {
    id: 'contact-walid',
    displayName: 'Walid',
    phoneNumber: '+212 6 45 67 89 01',
    initials: 'W',
    avatarColor: '#7C3AED',
  },
];

export const mockMessages: readonly Message[] = [
  {
    id: 'message-abdelilah-1',
    conversationId: 'conversation-abdelilah',
    senderId: 'contact-abdelilah',
    body: 'Tu as terminé la partie sécurité du projet ?',
    direction: 'incoming',
    status: 'read',
    sentAt: '2026-09-23T17:12:00.000Z',
  },
  {
    id: 'message-abdelilah-2',
    conversationId: 'conversation-abdelilah',
    senderId: 'self',
    body: 'Oui, je finalise les derniers tests Android.',
    direction: 'outgoing',
    status: 'delivered',
    sentAt: '2026-09-23T17:18:00.000Z',
  },
  {
    id: 'message-mehdi-1',
    conversationId: 'conversation-mehdi',
    senderId: 'self',
    body: 'On se retrouve à la bibliothèque à 18 h ?',
    direction: 'outgoing',
    status: 'read',
    sentAt: '2026-09-23T15:27:00.000Z',
  },
  {
    id: 'message-mehdi-2',
    conversationId: 'conversation-mehdi',
    senderId: 'contact-mehdi',
    body: 'Oui, à tout à l’heure !',
    direction: 'incoming',
    status: 'read',
    sentAt: '2026-09-23T15:31:00.000Z',
  },
  {
    id: 'message-yassine-1',
    conversationId: 'conversation-yassine',
    senderId: 'contact-yassine',
    body: 'Je viens de partager la présentation.',
    direction: 'incoming',
    status: 'read',
    sentAt: '2026-09-22T11:09:00.000Z',
  },
  {
    id: 'message-yassine-2',
    conversationId: 'conversation-yassine',
    senderId: 'self',
    body: 'Parfait, je la consulte maintenant.',
    direction: 'outgoing',
    status: 'delivered',
    sentAt: '2026-09-22T11:12:00.000Z',
  },
  {
    id: 'message-walid-1',
    conversationId: 'conversation-walid',
    senderId: 'contact-walid',
    body: 'Le rapport est prêt pour la soutenance.',
    direction: 'incoming',
    status: 'read',
    sentAt: '2026-09-21T16:45:00.000Z',
  },
];

export const mockConversations: readonly Conversation[] = [
  {
    id: 'conversation-abdelilah',
    contactId: 'contact-abdelilah',
    lastMessageId: 'message-abdelilah-2',
    lastMessageAt: '2026-09-23T17:18:00.000Z',
    unreadCount: 0,
  },
  {
    id: 'conversation-mehdi',
    contactId: 'contact-mehdi',
    lastMessageId: 'message-mehdi-2',
    lastMessageAt: '2026-09-23T15:31:00.000Z',
    unreadCount: 1,
  },
  {
    id: 'conversation-yassine',
    contactId: 'contact-yassine',
    lastMessageId: 'message-yassine-2',
    lastMessageAt: '2026-09-22T11:12:00.000Z',
    unreadCount: 0,
  },
  {
    id: 'conversation-walid',
    contactId: 'contact-walid',
    lastMessageId: 'message-walid-1',
    lastMessageAt: '2026-09-21T16:45:00.000Z',
    unreadCount: 1,
  },
];
