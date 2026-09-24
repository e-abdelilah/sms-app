const sensitiveFieldPattern = /body|cipher|content|hmac|key|message|phone|pin|secret|token/i;

function sanitize(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      sensitiveFieldPattern.test(key) ? '[REDACTED]' : value,
    ]),
  );
}

export function logSecurityEvent(event: string, metadata: Record<string, unknown> = {}) {
  if (!__DEV__) return;
  console.info('[security] ' + event, sanitize(metadata));
}
