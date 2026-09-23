import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { mockContacts, mockConversations, mockMessages } from '@/data/mock-sms';
import type { Contact, Conversation, Message } from '@/types/sms';

declare const conversationIdBrand: unique symbol;

/** A conversation identifier created by the in-memory store. */
export type ConversationId = string & {
  readonly [conversationIdBrand]: 'ConversationId';
};

export type SendMessageInput =
  | {
      contactId: string;
      body: string;
      conversationId?: never;
    }
  | {
      conversationId: string;
      body: string;
      contactId?: never;
    };

export type MockSmsContextValue = {
  contacts: readonly Contact[];
  /** Ordered from the most recently active conversation to the oldest. */
  conversations: readonly Conversation[];
  getConversation: (conversationId: string) => Conversation | undefined;
  getContact: (contactId: string) => Contact | undefined;
  /** Messages are ordered chronologically, oldest first. */
  getMessages: (conversationId: string) => readonly Message[];
  /**
   * Adds an outgoing message to the in-memory state and returns the owning
   * conversation ID. A conversation is created when sending to a new contact.
   */
  sendMessage: (input: SendMessageInput) => ConversationId;
};

const MockSmsContext = createContext<MockSmsContextValue | null>(null);

function newestMessageTime(conversation: Conversation, messages: readonly Message[]) {
  return messages.reduce((latest, message) => {
    if (message.conversationId !== conversation.id) {
      return latest;
    }

    return message.sentAt > latest ? message.sentAt : latest;
  }, conversation.lastMessageAt);
}

export function MockSmsProvider({ children }: PropsWithChildren) {
  const [conversationState, setConversationState] = useState<Conversation[]>(() => [
    ...mockConversations,
  ]);
  const [messageState, setMessageState] = useState<Message[]>(() => [...mockMessages]);
  const sequence = useRef(0);

  const conversations = useMemo(
    () =>
      [...conversationState].sort((first, second) =>
        newestMessageTime(second, messageState).localeCompare(newestMessageTime(first, messageState)),
      ),
    [conversationState, messageState],
  );

  const getConversation = useCallback(
    (conversationId: string) => conversationState.find((conversation) => conversation.id === conversationId),
    [conversationState],
  );

  const getContact = useCallback(
    (contactId: string) => mockContacts.find((contact) => contact.id === contactId),
    [],
  );

  const getMessages = useCallback(
    (conversationId: string) =>
      messageState
        .filter((message) => message.conversationId === conversationId)
        .sort((first, second) => first.sentAt.localeCompare(second.sentAt)),
    [messageState],
  );

  const sendMessage = useCallback(
    (input: SendMessageInput): ConversationId => {
      const body = input.body.trim();
      if (!body) {
        throw new Error('Le contenu du message ne peut pas être vide.');
      }

      const existingConversation =
        'conversationId' in input
          ? conversationState.find((conversation) => conversation.id === input.conversationId)
          : conversationState.find((conversation) => conversation.contactId === input.contactId);

      if ('conversationId' in input && !existingConversation) {
        throw new Error('Conversation introuvable.');
      }

      const contactId = existingConversation?.contactId ?? input.contactId;
      const contact = mockContacts.find((entry) => entry.id === contactId);
      if (!contact) {
        throw new Error('Contact introuvable.');
      }

      sequence.current += 1;
      const suffix = `${Date.now().toString(36)}-${sequence.current.toString(36)}`;
      const conversationId = (existingConversation?.id ??
        `conversation-local-${suffix}`) as ConversationId;
      const message: Message = {
        id: `message-local-${suffix}`,
        conversationId,
        senderId: 'self',
        body,
        direction: 'outgoing',
        status: 'sent',
        sentAt: new Date().toISOString(),
      };

      setMessageState((current) => [...current, message]);
      setConversationState((current) => {
        const found = current.find((conversation) => conversation.id === conversationId);
        if (found) {
          return current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  lastMessageId: message.id,
                  lastMessageAt: message.sentAt,
                  unreadCount: 0,
                }
              : conversation,
          );
        }

        return [
          ...current,
          {
            id: conversationId,
            contactId: contact.id,
            lastMessageId: message.id,
            lastMessageAt: message.sentAt,
            unreadCount: 0,
          },
        ];
      });

      return conversationId;
    },
    [conversationState],
  );

  const value = useMemo<MockSmsContextValue>(
    () => ({
      contacts: mockContacts,
      conversations,
      getConversation,
      getContact,
      getMessages,
      sendMessage,
    }),
    [conversations, getContact, getConversation, getMessages, sendMessage],
  );

  return <MockSmsContext.Provider value={value}>{children}</MockSmsContext.Provider>;
}

export function useMockSms() {
  const context = useContext(MockSmsContext);
  if (!context) {
    throw new Error('useMockSms doit être utilisé dans un MockSmsProvider.');
  }

  return context;
}
