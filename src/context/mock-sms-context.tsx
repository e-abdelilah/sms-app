import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { mockContacts, mockConversations, mockMessages } from '@/data/mock-sms';
import {
  normalizePhoneNumber,
  validateMessageBody,
  validatePhoneNumber,
} from '@/security/input-validation';
import { logSecurityEvent } from '@/security/secure-logger';
import { loadSecureMessages, saveSecureMessage } from '@/storage/secure-message-repository';
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
      recipientPhoneNumber: string;
      conversationId?: never;
    }
  | {
      conversationId: string;
      body: string;
      contactId?: never;
      recipientPhoneNumber?: never;
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
  sendMessage: (input: SendMessageInput) => Promise<ConversationId>;
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

  useEffect(() => {
    let active = true;

    void loadSecureMessages()
      .then((storedMessages) => {
        if (!active) return;

        setMessageState((current) => {
          const existingIds = new Set(current.map((message) => message.id));
          return [...current, ...storedMessages.map((entry) => entry.message).filter((message) => !existingIds.has(message.id))];
        });
        setConversationState((current) => {
          const next = [...current];

          for (const { contactId, message } of storedMessages) {
            const existingIndex = next.findIndex((conversation) => conversation.id === message.conversationId);
            const existing = next[existingIndex];

            if (existing && message.sentAt > existing.lastMessageAt) {
              next[existingIndex] = {
                ...existing,
                lastMessageAt: message.sentAt,
                lastMessageId: message.id,
              };
            } else if (!existing && mockContacts.some((contact) => contact.id === contactId)) {
              next.push({
                contactId,
                id: message.conversationId,
                lastMessageAt: message.sentAt,
                lastMessageId: message.id,
                unreadCount: 0,
              });
            }
          }

          return next;
        });
      })
      .catch(() => logSecurityEvent('secure-storage-load-failed'));

    return () => {
      active = false;
    };
  }, []);

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
    async (input: SendMessageInput): Promise<ConversationId> => {
      const messageValidation = validateMessageBody(input.body);
      if (!messageValidation.isValid) throw new Error(messageValidation.error);

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

      const recipientPhoneNumber =
        typeof input.recipientPhoneNumber === 'string'
          ? input.recipientPhoneNumber
          : contact.phoneNumber;
      const phoneValidation = validatePhoneNumber(recipientPhoneNumber);
      if (!phoneValidation.isValid) throw new Error(phoneValidation.error);

      if (phoneValidation.value !== normalizePhoneNumber(contact.phoneNumber)) {
        throw new Error('Le numéro ne correspond pas au contact sélectionné.');
      }

      sequence.current += 1;
      const suffix = `${Date.now().toString(36)}-${sequence.current.toString(36)}`;
      const conversationId = (existingConversation?.id ??
        `conversation-local-${suffix}`) as ConversationId;
      const message: Message = {
        id: `message-local-${suffix}`,
        conversationId,
        senderId: 'self',
        body: messageValidation.value,
        direction: 'outgoing',
        integrityStatus: 'valid',
        status: 'sent',
        sentAt: new Date().toISOString(),
      };

      await saveSecureMessage(message, contact.id);
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
