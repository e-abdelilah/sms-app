import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricAuthenticationResult =
  | { status: 'authenticated' }
  | { status: 'cancelled' }
  | { status: 'failed' }
  | { status: 'locked-out' }
  | { status: 'not-enrolled' }
  | { status: 'unavailable' };

async function getBiometricAvailability() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return 'unavailable' as const;
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'unavailable' as const;

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return 'not-enrolled' as const;

    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    return enrolledLevel >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG
      ? ('strong' as const)
      : ('weak' as const);
  } catch {
    return 'unavailable' as const;
  }
}

export async function authenticateWithBiometrics(): Promise<BiometricAuthenticationResult> {
  const availability = await getBiometricAvailability();

  if (availability === 'not-enrolled') return { status: 'not-enrolled' };
  if (availability === 'unavailable') return { status: 'unavailable' };

  try {
    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: availability,
      cancelLabel: 'Annuler',
      disableDeviceFallback: true,
      promptDescription: 'Utilisez la biométrie enregistrée sur cet appareil.',
      promptMessage: 'Déverrouiller SecureSMS',
      promptSubtitle: 'Confirmez votre identité',
      requireConfirmation: true,
    });

    if (result.success) return { status: 'authenticated' };

    switch (result.error) {
      case 'app_cancel':
      case 'system_cancel':
      case 'user_cancel':
        return { status: 'cancelled' };
      case 'lockout':
        return { status: 'locked-out' };
      case 'not_enrolled':
        return { status: 'not-enrolled' };
      case 'not_available':
      case 'passcode_not_set':
        return { status: 'unavailable' };
      default:
        return { status: 'failed' };
    }
  } catch {
    return { status: 'failed' };
  }
}
