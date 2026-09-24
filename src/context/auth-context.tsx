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

import {
  clearAuthProfile,
  loadAuthProfile,
  saveAuthProfile,
  type AuthProfile,
} from '@/security/auth-profile-store';
import {
  getAttemptsRemaining,
  MAX_PIN_FAILED_ATTEMPTS,
  PIN_RETRY_DELAY_MS,
  TEMPORARY_PIN_LOCK_MS,
} from '@/security/pin-attempt-policy';
import { isValidPin } from '@/security/pin-policy';
import { useSessionSecurity } from '@/security/use-session-security';

export type AccountProfile = AuthProfile['account'];

type BeginEnrollmentResult =
  | { status: 'invalid-pin' }
  | { status: 'ready-to-confirm' };

type ConfirmEnrollmentResult =
  | { status: 'configured' }
  | { status: 'invalid-pin' }
  | { status: 'mismatch' };

type UnlockResult =
  | { status: 'accepted' }
  | { status: 'invalid-pin' }
  | { retryAvailableAt: number; status: 'retry-delayed' }
  | {
      failedAttempts: number;
      remainingAttempts: number;
      retryAvailableAt: number;
      status: 'rejected';
    }
  | {
      failedAttempts: number;
      status: 'temporarily-locked';
      temporarilyLockedUntil: number;
    };

export type PinProtectionState = {
  failedAttempts: number;
  retryAvailableAt: number | null;
  temporarilyLockedUntil: number | null;
};

type AuthContextValue = {
  account: AccountProfile | null;
  beginEnrollment: (pin: string) => BeginEnrollmentResult;
  confirmEnrollment: (pin: string) => ConfirmEnrollmentResult;
  isAccountConfigured: boolean;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  isPinConfigured: boolean;
  lock: () => void;
  pinProtection: PinProtectionState;
  reauthenticate: (pin: string) => UnlockResult;
  recordUserActivity: () => void;
  registerAccount: (account: AccountProfile) => Promise<void>;
  sessionExpiresAt: number | null;
  signOut: () => Promise<void>;
  unlock: (pin: string) => UnlockResult;
};

const initialPinProtection: PinProtectionState = {
  failedAttempts: 0,
  retryAvailableAt: null,
  temporarilyLockedUntil: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const configuredPinRef = useRef<string | null>(null);
  const pendingPinRef = useRef<string | null>(null);
  const accountRef = useRef<AccountProfile | null>(null);
  const failedAttemptsRef = useRef(0);
  const retryAvailableAtRef = useRef<number | null>(null);
  const temporarilyLockedUntilRef = useRef<number | null>(null);
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPinConfigured, setIsPinConfigured] = useState(false);
  const [pinProtection, setPinProtection] = useState<PinProtectionState>(initialPinProtection);
  const {
    isAuthenticated,
    lock,
    recordUserActivity,
    sessionExpiresAt,
    startAuthenticatedSession,
  } = useSessionSecurity();

  useEffect(() => {
    let active = true;

    void loadAuthProfile()
      .catch(() => null)
      .then((profile) => {
        if (!active || !profile) return;

        accountRef.current = profile.account;
        setAccount(profile.account);

        if (profile.pin && isValidPin(profile.pin)) {
          configuredPinRef.current = profile.pin;
          setIsPinConfigured(true);
        }
      })
      .finally(() => {
        if (active) setIsAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const publishPinProtection = useCallback(() => {
    setPinProtection({
      failedAttempts: failedAttemptsRef.current,
      retryAvailableAt: retryAvailableAtRef.current,
      temporarilyLockedUntil: temporarilyLockedUntilRef.current,
    });
  }, []);

  const resetPinProtection = useCallback(() => {
    failedAttemptsRef.current = 0;
    retryAvailableAtRef.current = null;
    temporarilyLockedUntilRef.current = null;
    publishPinProtection();
  }, [publishPinProtection]);

  const expirePinProtection = useCallback(
    (now = Date.now()) => {
      const temporarilyLockedUntil = temporarilyLockedUntilRef.current;

      if (temporarilyLockedUntil !== null && now >= temporarilyLockedUntil) {
        resetPinProtection();
        return;
      }

      const retryAvailableAt = retryAvailableAtRef.current;
      if (retryAvailableAt !== null && now >= retryAvailableAt) {
        retryAvailableAtRef.current = null;
        publishPinProtection();
      }
    },
    [publishPinProtection, resetPinProtection],
  );

  useEffect(() => {
    const nextDeadline = pinProtection.temporarilyLockedUntil ?? pinProtection.retryAvailableAt;
    if (nextDeadline === null) return;

    const timeout = setTimeout(
      () => expirePinProtection(),
      Math.max(0, nextDeadline - Date.now()) + 10,
    );

    return () => clearTimeout(timeout);
  }, [expirePinProtection, pinProtection.retryAvailableAt, pinProtection.temporarilyLockedUntil]);

  const registerAccount = useCallback(async (nextAccount: AccountProfile) => {
    await saveAuthProfile({ account: nextAccount, pin: null });
    accountRef.current = nextAccount;
    configuredPinRef.current = null;
    setAccount(nextAccount);
    setIsPinConfigured(false);
  }, []);

  const beginEnrollment = useCallback((pin: string): BeginEnrollmentResult => {
    if (!isValidPin(pin)) return { status: 'invalid-pin' };
    pendingPinRef.current = pin;
    return { status: 'ready-to-confirm' };
  }, []);

  const confirmEnrollment = useCallback(
    (pin: string): ConfirmEnrollmentResult => {
      const pendingPin = pendingPinRef.current;
      const currentAccount = accountRef.current;

      if (!currentAccount || !pendingPin || !isValidPin(pin)) {
        pendingPinRef.current = null;
        return { status: 'invalid-pin' };
      }

      if (pin !== pendingPin) {
        pendingPinRef.current = null;
        return { status: 'mismatch' };
      }

      configuredPinRef.current = pin;
      pendingPinRef.current = null;
      resetPinProtection();
      setIsPinConfigured(true);
      void saveAuthProfile({ account: currentAccount, pin }).catch(() => undefined);
      lock();
      return { status: 'configured' };
    },
    [lock, resetPinProtection],
  );

  const unlock = useCallback(
    (pin: string): UnlockResult => {
      const now = Date.now();
      expirePinProtection(now);

      const temporarilyLockedUntil = temporarilyLockedUntilRef.current;
      if (temporarilyLockedUntil !== null && now < temporarilyLockedUntil) {
        return {
          failedAttempts: failedAttemptsRef.current,
          status: 'temporarily-locked',
          temporarilyLockedUntil,
        };
      }

      const retryAvailableAt = retryAvailableAtRef.current;
      if (retryAvailableAt !== null && now < retryAvailableAt) {
        return { retryAvailableAt, status: 'retry-delayed' };
      }

      if (!isValidPin(pin) || configuredPinRef.current === null) {
        return { status: 'invalid-pin' };
      }

      if (pin === configuredPinRef.current) {
        resetPinProtection();
        startAuthenticatedSession();
        return { status: 'accepted' };
      }

      const failedAttempts = failedAttemptsRef.current + 1;
      failedAttemptsRef.current = failedAttempts;

      if (failedAttempts >= MAX_PIN_FAILED_ATTEMPTS) {
        const newTemporaryLockUntil = now + TEMPORARY_PIN_LOCK_MS;
        retryAvailableAtRef.current = null;
        temporarilyLockedUntilRef.current = newTemporaryLockUntil;
        publishPinProtection();
        return {
          failedAttempts,
          status: 'temporarily-locked',
          temporarilyLockedUntil: newTemporaryLockUntil,
        };
      }

      const newRetryAvailableAt = now + PIN_RETRY_DELAY_MS;
      retryAvailableAtRef.current = newRetryAvailableAt;
      publishPinProtection();
      return {
        failedAttempts,
        remainingAttempts: getAttemptsRemaining(failedAttempts),
        retryAvailableAt: newRetryAvailableAt,
        status: 'rejected',
      };
    },
    [expirePinProtection, publishPinProtection, resetPinProtection, startAuthenticatedSession],
  );

  const signOut = useCallback(async () => {
    await clearAuthProfile();
    configuredPinRef.current = null;
    pendingPinRef.current = null;
    accountRef.current = null;
    resetPinProtection();
    setIsPinConfigured(false);
    setAccount(null);
    lock();
  }, [lock, resetPinProtection]);

  const value = useMemo<AuthContextValue>(
    () => ({
      account,
      beginEnrollment,
      confirmEnrollment,
      isAccountConfigured: account !== null,
      isAuthReady,
      isAuthenticated,
      isPinConfigured,
      lock,
      pinProtection,
      reauthenticate: unlock,
      recordUserActivity,
      registerAccount,
      sessionExpiresAt,
      signOut,
      unlock,
    }),
    [
      account,
      beginEnrollment,
      confirmEnrollment,
      isAuthReady,
      isAuthenticated,
      isPinConfigured,
      lock,
      pinProtection,
      recordUserActivity,
      registerAccount,
      sessionExpiresAt,
      signOut,
      unlock,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
}
