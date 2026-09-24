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
  authenticateWithBiometrics,
  type BiometricAuthenticationResult,
} from '@/security/biometric-authentication';
import { loadAuthProfile, saveAuthProfile } from '@/security/auth-profile-store';
import {
  getAttemptsRemaining,
  MAX_PIN_FAILED_ATTEMPTS,
  PIN_RETRY_DELAY_MS,
  TEMPORARY_PIN_LOCK_MS,
} from '@/security/pin-attempt-policy';
import { isValidPin } from '@/security/pin-policy';
import { useSessionSecurity } from '@/security/use-session-security';

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

type BiometricUnlockResult = BiometricAuthenticationResult | { status: 'not-enabled' };

export type PinProtectionState = {
  failedAttempts: number;
  retryAvailableAt: number | null;
  temporarilyLockedUntil: number | null;
};

type AuthContextValue = {
  beginEnrollment: (pin: string) => BeginEnrollmentResult;
  confirmEnrollment: (pin: string) => ConfirmEnrollmentResult;
  disableBiometrics: () => void;
  enableBiometrics: () => Promise<BiometricAuthenticationResult>;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  isPinConfigured: boolean;
  lock: () => void;
  pinProtection: PinProtectionState;
  reauthenticate: (pin: string) => UnlockResult;
  recordUserActivity: () => void;
  sessionExpiresAt: number | null;
  unlock: (pin: string) => UnlockResult;
  unlockWithBiometrics: () => Promise<BiometricUnlockResult>;
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
  const failedAttemptsRef = useRef(0);
  const retryAvailableAtRef = useRef<number | null>(null);
  const temporarilyLockedUntilRef = useRef<number | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPinConfigured, setIsPinConfigured] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
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
        if (!active || !profile || !isValidPin(profile.pin)) return;
        configuredPinRef.current = profile.pin;
        setIsPinConfigured(true);
        setIsBiometricEnabled(profile.biometricsEnabled);
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

  const beginEnrollment = useCallback((pin: string): BeginEnrollmentResult => {
    if (!isValidPin(pin)) return { status: 'invalid-pin' };

    pendingPinRef.current = pin;
    return { status: 'ready-to-confirm' };
  }, []);

  const confirmEnrollment = useCallback(
    (pin: string): ConfirmEnrollmentResult => {
      const pendingPin = pendingPinRef.current;

      if (!pendingPin || !isValidPin(pin)) {
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
      setIsBiometricEnabled(false);
      setIsPinConfigured(true);
      void saveAuthProfile({ biometricsEnabled: false, pin }).catch(() => undefined);
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

  const enableBiometrics = useCallback(async (): Promise<BiometricAuthenticationResult> => {
    const result = await authenticateWithBiometrics();

    if (result.status === 'authenticated') {
      setIsBiometricEnabled(true);
      const pin = configuredPinRef.current;
      if (pin) void saveAuthProfile({ biometricsEnabled: true, pin }).catch(() => undefined);
    }

    return result;
  }, []);

  const disableBiometrics = useCallback(() => {
    setIsBiometricEnabled(false);
    const pin = configuredPinRef.current;
    if (pin) void saveAuthProfile({ biometricsEnabled: false, pin }).catch(() => undefined);
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<BiometricUnlockResult> => {
    if (!isBiometricEnabled) return { status: 'not-enabled' };

    const result = await authenticateWithBiometrics();

    if (result.status === 'authenticated') {
      resetPinProtection();
      startAuthenticatedSession();
    }

    return result;
  }, [isBiometricEnabled, resetPinProtection, startAuthenticatedSession]);

  const value = useMemo(
    () => ({
      beginEnrollment,
      confirmEnrollment,
      disableBiometrics,
      enableBiometrics,
      isAuthReady,
      isAuthenticated,
      isBiometricEnabled,
      isPinConfigured,
      lock,
      pinProtection,
      reauthenticate: unlock,
      recordUserActivity,
      sessionExpiresAt,
      unlock,
      unlockWithBiometrics,
    }),
    [
      beginEnrollment,
      confirmEnrollment,
      disableBiometrics,
      enableBiometrics,
      isAuthReady,
      isAuthenticated,
      isBiometricEnabled,
      isPinConfigured,
      lock,
      pinProtection,
      recordUserActivity,
      sessionExpiresAt,
      unlock,
      unlockWithBiometrics,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
