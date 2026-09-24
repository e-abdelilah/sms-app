import * as SecureStore from 'expo-secure-store';

const AUTH_PROFILE_KEY = 'securesms.auth-profile.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'securesms.authentication',
};

export type AuthProfile = {
  account: {
    displayName: string;
    identifier: string;
    provider: 'email' | 'google';
  };
  pin: string | null;
};

let volatileProfile: AuthProfile | null = null;

export async function clearAuthProfile() {
  volatileProfile = null;
  if (!(await SecureStore.isAvailableAsync())) return;
  await SecureStore.deleteItemAsync(AUTH_PROFILE_KEY, secureStoreOptions);
}

export async function loadAuthProfile(): Promise<AuthProfile | null> {
  if (!(await SecureStore.isAvailableAsync())) return volatileProfile;

  const serializedProfile = await SecureStore.getItemAsync(AUTH_PROFILE_KEY, secureStoreOptions);
  if (!serializedProfile) return null;

  try {
    const profile = JSON.parse(serializedProfile) as Partial<AuthProfile>;
    const account = profile.account;
    if (
      !account ||
      typeof account.displayName !== 'string' ||
      typeof account.identifier !== 'string' ||
      (account.provider !== 'email' && account.provider !== 'google') ||
      (profile.pin !== null && typeof profile.pin !== 'string')
    ) {
      return null;
    }

    return {
      account: {
        displayName: account.displayName,
        identifier: account.identifier,
        provider: account.provider,
      },
      pin: profile.pin ?? null,
    };
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
