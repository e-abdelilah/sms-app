import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  decryptMessage,
  encryptMessage,
  type EncryptedMessagePayload,
} from '@/security/encryption-service';
import type { Message } from '@/types/sms';

const DATABASE_NAME = 'secure-sms.db';

type SecureMessageRow = {
  algorithm: string;
  ciphertext: string;
  contact_id: string;
  conversation_id: string;
  direction: string;
  id: string;
  integrity_tag: string;
  sender_id: string;
  sent_at: string;
  status: string;
};

export type StoredSecureMessage = {
  contactId: string;
  message: Message;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME).then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS secure_messages (
          id TEXT PRIMARY KEY NOT NULL,
          conversation_id TEXT NOT NULL,
          contact_id TEXT NOT NULL,
          sender_id TEXT NOT NULL,
          ciphertext TEXT NOT NULL,
          integrity_tag TEXT NOT NULL,
          algorithm TEXT NOT NULL,
          direction TEXT NOT NULL,
          status TEXT NOT NULL,
          sent_at TEXT NOT NULL
        );
      `);
      return database;
    });
  }

  return databasePromise;
}

export async function saveSecureMessage(message: Message, contactId: string) {
  const encrypted = await encryptMessage(message.body);
  const database = await getDatabase();
  const statement = await database.prepareAsync(`
    INSERT OR REPLACE INTO secure_messages (
      id, conversation_id, contact_id, sender_id, ciphertext,
      integrity_tag, algorithm, direction, status, sent_at
    ) VALUES (
      $id, $conversationId, $contactId, $senderId, $ciphertext,
      $integrityTag, $algorithm, $direction, $status, $sentAt
    )
  `);

  try {
    await statement.executeAsync({
      $algorithm: encrypted.algorithm,
      $ciphertext: encrypted.ciphertext,
      $contactId: contactId,
      $conversationId: message.conversationId,
      $direction: message.direction,
      $id: message.id,
      $integrityTag: encrypted.integrityTag,
      $senderId: message.senderId,
      $sentAt: message.sentAt,
      $status: message.status,
    });
  } finally {
    await statement.finalizeAsync();
  }
}

export async function loadSecureMessages(): Promise<StoredSecureMessage[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<SecureMessageRow>(
    'SELECT * FROM secure_messages ORDER BY sent_at ASC',
  );

  return Promise.all(
    rows.map(async (row) => {
      const encryptedPayload: EncryptedMessagePayload = {
        algorithm: row.algorithm as EncryptedMessagePayload['algorithm'],
        ciphertext: row.ciphertext,
        integrityTag: row.integrity_tag,
      };
      const decrypted = await decryptMessage(encryptedPayload);

      return {
        contactId: row.contact_id,
        message: {
          body: decrypted.plaintext ?? '[Message altéré : intégrité invalide]',
          conversationId: row.conversation_id,
          direction: row.direction === 'incoming' ? 'incoming' : 'outgoing',
          id: row.id,
          integrityStatus: decrypted.integrity,
          senderId: row.sender_id,
          sentAt: row.sent_at,
          status:
            row.status === 'read' || row.status === 'delivered' ? row.status : 'sent',
        },
      };
    }),
  );
}

/**
 * Security demonstration: the untrusted value is bound as data, never
 * concatenated into the SQL command. An injection payload therefore matches
 * no generated message identifier and returns zero rows.
 */
export async function runParameterizedSqlInjectionProbe(untrustedValue: string) {
  const database = await getDatabase();
  const statement = await database.prepareAsync(
    'SELECT COUNT(*) AS match_count FROM secure_messages WHERE id = $untrustedValue',
  );

  try {
    const result = await statement.executeAsync<{ match_count: number }>({
      $untrustedValue: untrustedValue,
    });
    const row = await result.getFirstAsync();
    return row?.match_count ?? 0;
  } finally {
    await statement.finalizeAsync();
  }
}

export async function tamperLatestSecureMessage() {
  const database = await getDatabase();
  const latest = await database.getFirstAsync<{ id: string; ciphertext: string }>(
    'SELECT id, ciphertext FROM secure_messages ORDER BY sent_at DESC LIMIT 1',
  );
  if (!latest) return false;

  const statement = await database.prepareAsync(
    'UPDATE secure_messages SET ciphertext = $ciphertext WHERE id = $id',
  );
  try {
    await statement.executeAsync({
      $ciphertext: latest.ciphertext.slice(0, -1) + (latest.ciphertext.endsWith('A') ? 'B' : 'A'),
      $id: latest.id,
    });
  } finally {
    await statement.finalizeAsync();
  }
  return true;
}
