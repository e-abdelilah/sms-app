import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { isValidPin } from '@/security/pin-policy';

type BeginEnrollmentResult =
  | { status: 'invalid-pin' }
  | { status: 'ready-to-confirm' };

type ConfirmEnrollmentResult =
  | { status: 'configured' }
  | { status: 'invalid-pin' }
  | { status: 'mismatch' };

type UnlockResult = { status: 'accepted' } | { status: 'rejected' };

type AuthContextValue = {
  beginEnrollment: (pin: string) => BeginEnrollmentResult;
  confirmEnrollment: (pin: string) => ConfirmEnrollmentResult;
  isAuthenticated: boolean;
  isPinConfigured: boolean;
  lock: () => void;
  unlock: (pin: string) => UnlockResult;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  // This deliberately stays in memory for Phase 2. It is never rendered, logged, or exposed by the context.
  const configuredPinRef = useRef<string | null>(null);
  const pendingPinRef = useRef<string | null>(null);
  const [isPinConfigured, setIsPinConfigured] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const beginEnrollment = useCallback((pin: string): BeginEnrollmentResult => {
    if (!isValidPin(pin)) return { status: 'invalid-pin' };

    pendingPinRef.current = pin;
    return { status: 'ready-to-confirm' };
  }, []);

  const confirmEnrollment = useCallback((pin: string): ConfirmEnrollmentResult => {
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
    setIsPinConfigured(true);
    setIsAuthenticated(false);
    return { status: 'configured' };
  }, []);

  const unlock = useCallback((pin: string): UnlockResult => {
    if (!isValidPin(pin) || configuredPinRef.current === null || pin !== configuredPinRef.current) {
      return { status: 'rejected' };
    }

    setIsAuthenticated(true);
    return { status: 'accepted' };
  }, []);

  const lock = useCallback(() => setIsAuthenticated(false), []);

  const value = useMemo(
    () => ({
      beginEnrollment,
      confirmEnrollment,
      isAuthenticated,
      isPinConfigured,
      lock,
      unlock,
    }),
    [beginEnrollment, confirmEnrollment, isAuthenticated, isPinConfigured, lock, unlock],
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
