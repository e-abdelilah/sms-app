export type SecurityEvent =
  | 'Authentication attempt'
  | 'Message processed successfully'
  | 'Secure storage load failed';

/**
 * Logs only predefined event names. Sensitive values and arbitrary metadata
 * are intentionally unsupported so PINs, messages and keys cannot be passed.
 */
export function logSecurityEvent(event: SecurityEvent) {
  if (!__DEV__) return;
  console.info('[security] ' + event);
}
