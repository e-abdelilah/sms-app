import { AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';

import { bytesToUtf8, utf8ToBytes } from '@/security/binary-encoding';
import { createIntegrityTag, verifyIntegrityTag } from '@/security/integrity-service';
import { getOrCreateAesKey } from '@/security/key-store-service';

export const MESSAGE_ENCRYPTION_ALGORITHM = 'AES-256-GCM' as const;

export type EncryptedMessagePayload = {
  algorithm: typeof MESSAGE_ENCRYPTION_ALGORITHM;
  ciphertext: string;
  integrityTag: string;
};

export async function encryptMessage(plaintext: string): Promise<EncryptedMessagePayload> {
  const key = await getOrCreateAesKey();
  const sealedData = await aesEncryptAsync(utf8ToBytes(plaintext), key);
  const ciphertext = await sealedData.combined('base64');

  return {
    algorithm: MESSAGE_ENCRYPTION_ALGORITHM,
    ciphertext,
    integrityTag: await createIntegrityTag(ciphertext),
  };
}

export async function decryptMessage(payload: EncryptedMessagePayload) {
  if (payload.algorithm !== MESSAGE_ENCRYPTION_ALGORITHM) {
    return { integrity: 'invalid', plaintext: null } as const;
  }

  if (!(await verifyIntegrityTag(payload.ciphertext, payload.integrityTag))) {
    return { integrity: 'invalid', plaintext: null } as const;
  }

  try {
    const key = await getOrCreateAesKey();
    const sealedData = AESSealedData.fromCombined(payload.ciphertext);
    const plaintext = await aesDecryptAsync(sealedData, key);
    return { integrity: 'valid', plaintext: bytesToUtf8(plaintext) } as const;
  } catch {
    return { integrity: 'invalid', plaintext: null } as const;
  }
}
