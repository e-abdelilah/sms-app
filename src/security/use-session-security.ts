import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  BACKGROUND_LOCK_DELAY_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_MAX_DURATION_MS,
} from '@/security/session-policy';

type Timer = ReturnType<typeof setTimeout>;

export function useSessionSecurity() {
  const isAuthenticatedRef = useRef(false);
  const sessionStartedAtRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef<number | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);
  const sessionExpirationTimerRef = useRef<Timer | null>(null);
  const inactivityTimerRef = useRef<Timer | null>(null);
  const backgroundTimerRef = useRef<Timer | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const clearTimer = useCallback((timerRef: { current: Timer | null }) => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearAllTimers = useCallback(() => {
    clearTimer(sessionExpirationTimerRef);
    clearTimer(inactivityTimerRef);
    clearTimer(backgroundTimerRef);
  }, [clearTimer]);

  const lock = useCallback(() => {
    clearAllTimers();
    isAuthenticatedRef.current = false;
    sessionStartedAtRef.current = null;
    lastActivityAtRef.current = null;
    backgroundedAtRef.current = null;
    setSessionExpiresAt(null);
    setIsAuthenticated(false);
  }, [clearAllTimers]);

  const startAuthenticatedSession = useCallback(() => {
    const now = Date.now();

    clearAllTimers();
    isAuthenticatedRef.current = true;
    sessionStartedAtRef.current = now;
    lastActivityAtRef.current = now;
    backgroundedAtRef.current = null;
    setSessionExpiresAt(now + SESSION_MAX_DURATION_MS);
    setIsAuthenticated(true);

    sessionExpirationTimerRef.current = setTimeout(lock, SESSION_MAX_DURATION_MS);
    inactivityTimerRef.current = setTimeout(lock, SESSION_INACTIVITY_TIMEOUT_MS);
  }, [clearAllTimers, lock]);

  const recordUserActivity = useCallback(() => {
    if (!isAuthenticatedRef.current || AppState.currentState !== 'active') return;

    lastActivityAtRef.current = Date.now();
    clearTimer(inactivityTimerRef);
    inactivityTimerRef.current = setTimeout(lock, SESSION_INACTIVITY_TIMEOUT_MS);
  }, [clearTimer, lock]);

  useEffect(() => {
    let previousState: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const now = Date.now();

      if (nextState !== 'active' && previousState === 'active' && isAuthenticatedRef.current) {
        backgroundedAtRef.current = now;
        clearTimer(backgroundTimerRef);
        backgroundTimerRef.current = setTimeout(lock, BACKGROUND_LOCK_DELAY_MS);
      }

      if (nextState === 'active' && previousState !== 'active' && isAuthenticatedRef.current) {
        clearTimer(backgroundTimerRef);

        const sessionStartedAt = sessionStartedAtRef.current;
        const lastActivityAt = lastActivityAtRef.current;
        const backgroundedAt = backgroundedAtRef.current;
        const mustLock =
          sessionStartedAt === null ||
          lastActivityAt === null ||
          (backgroundedAt !== null && now - backgroundedAt >= BACKGROUND_LOCK_DELAY_MS) ||
          now - sessionStartedAt >= SESSION_MAX_DURATION_MS ||
          now - lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS;

        if (mustLock) {
          lock();
        } else {
          backgroundedAtRef.current = null;
          recordUserActivity();
        }
      }

      previousState = nextState;
    });

    return () => {
      subscription.remove();
      clearAllTimers();
    };
  }, [clearAllTimers, clearTimer, lock, recordUserActivity]);

  return {
    isAuthenticated,
    lock,
    recordUserActivity,
    sessionExpiresAt,
    startAuthenticatedSession,
  };
}
