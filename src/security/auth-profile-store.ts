import * as SecureStore from 'expo-secure-store';

const AUTH_PROFILE_KEY = 'securesms.auth-profile.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'securesms.authentication',
};

export type AuthProfile = {
  biometricsEnabled: boolean;
  pin: string;
};

let volatileProfile: AuthProfile | null = null;

export async function loadAuthProfile(): Promise<AuthProfile | null> {
  if (!(await SecureStore.isAvailableAsync())) return volatileProfile;

  const serializedProfile = await SecureStore.getItemAsync(AUTH_PROFILE_KEY, secureStoreOptions);
  if (!serializedProfile) return null;

  try {
    const profile = JSON.parse(serializedProfile) as Partial<AuthProfile>;
    if (typeof profile.pin !== 'string' || typeof profile.biometricsEnabled !== 'boolean') return null;
    return { biometricsEnabled: profile.biometricsEnabled, pin: profile.pin };
  } catch {
    return null;
  }
}

export async function saveAuthProfile(profile: AuthProfile) {
  if (!(await SecureStore.isAvailableAsync())) {
    volatileProfile = profile;
    return;
  }

  await SecureStore.setItemAsync(AUTH_PROFILE_KEY, JSON.stringify(profile), secureStoreOptions);
}
