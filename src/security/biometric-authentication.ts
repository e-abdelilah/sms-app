import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricAuthenticationResult =
  | { status: 'authenticated' }
  | { status: 'cancelled' }
  | { status: 'failed' }
  | { status: 'locked-out' }
  | { status: 'not-enrolled' }
  | { status: 'unavailable' };

async function getStrongBiometricAvailability() {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return 'unavailable' as const;
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return 'unavailable' as const;

    const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync();
    if (enrolledLevel < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
      return 'not-enrolled' as const;
    }

    return 'available' as const;
  } catch {
    return 'unavailable' as const;
  }
}

export async function authenticateWithStrongBiometrics(): Promise<BiometricAuthenticationResult> {
  const availability = await getStrongBiometricAvailability();

  if (availability === 'not-enrolled') return { status: 'not-enrolled' };
  if (availability === 'unavailable') return { status: 'unavailable' };

  try {
    const result = await LocalAuthentication.authenticateAsync({
      biometricsSecurityLevel: 'strong',
      cancelLabel: 'Annuler',
      disableDeviceFallback: true,
      promptDescription: 'Utilisez une biométrie forte enregistrée sur cet appareil.',
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
