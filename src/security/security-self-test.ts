import { decryptMessage, encryptMessage } from '@/security/encryption-service';

export async function runIntegrityTamperTest() {
  const protectedMessage = await encryptMessage('message pédagogique');
  const tamperedCiphertext =
    protectedMessage.ciphertext.slice(0, -1) +
    (protectedMessage.ciphertext.endsWith('A') ? 'B' : 'A');
  const result = await decryptMessage({
    ...protectedMessage,
    ciphertext: tamperedCiphertext,
  });

  return result.integrity === 'invalid' && result.plaintext === null;
}
