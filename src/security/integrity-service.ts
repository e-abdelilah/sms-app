import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { bytesToHex, utf8ToBytes } from '@/security/binary-encoding';
import { getOrCreateHmacKey } from '@/security/key-store-service';

const INTEGRITY_VERSION = 'hmac-sha256-v1';

function constantTimeEqual(first: string, second: string) {
  const maximumLength = Math.max(first.length, second.length);
  let difference = first.length ^ second.length;

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }

  return difference === 0;
}

export async function createIntegrityTag(ciphertext: string) {
  const key = await getOrCreateHmacKey();
  const authenticatedValue = INTEGRITY_VERSION + '.' + ciphertext;
  return bytesToHex(hmac(sha256, key, utf8ToBytes(authenticatedValue)));
}

export async function verifyIntegrityTag(ciphertext: string, expectedTag: string) {
  const calculatedTag = await createIntegrityTag(ciphertext);
  return constantTimeEqual(calculatedTag, expectedTag);
}
