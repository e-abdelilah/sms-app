import { AESEncryptionKey, getRandomBytesAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { base64ToBytes, bytesToBase64 } from '@/security/binary-encoding';

const AES_KEY_NAME = 'securesms.aes-key.v1';
const HMAC_KEY_NAME = 'securesms.hmac-key.v1';
const KEYCHAIN_SERVICE = 'securesms.crypto-keys';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: KEYCHAIN_SERVICE,
};

let volatileAesKey: string | null = null;
let volatileHmacKey: string | null = null;

async function readSecret(name: string) {
  if (!(await SecureStore.isAvailableAsync())) {
    return name === AES_KEY_NAME ? volatileAesKey : volatileHmacKey;
  }

  return SecureStore.getItemAsync(name, secureStoreOptions);
}

async function writeSecret(name: string, value: string) {
  if (!(await SecureStore.isAvailableAsync())) {
    if (name === AES_KEY_NAME) volatileAesKey = value;
    else volatileHmacKey = value;
    return;
  }

  await SecureStore.setItemAsync(name, value, secureStoreOptions);
}

export async function getOrCreateAesKey() {
  const storedKey = await readSecret(AES_KEY_NAME);
  if (storedKey) return AESEncryptionKey.import(storedKey, 'base64') as Promise<AESEncryptionKey>;

  const generatedKey = (await AESEncryptionKey.generate()) as AESEncryptionKey;
  await writeSecret(AES_KEY_NAME, await generatedKey.encoded('base64'));
  return generatedKey;
}

export async function getOrCreateHmacKey() {
  const storedKey = await readSecret(HMAC_KEY_NAME);
  if (storedKey) return base64ToBytes(storedKey);

  const generatedKey = await getRandomBytesAsync(32);
  await writeSecret(HMAC_KEY_NAME, bytesToBase64(generatedKey));
  return generatedKey;
}
