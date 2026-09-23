/** PIN policy used by the local Phase 2 app lock. This is not a stored secret. */
export const PIN_LENGTH = 6;

const pinPattern = new RegExp(`^[0-9]{${PIN_LENGTH}}$`);

export function isValidPin(pin: string) {
  return pinPattern.test(pin);
}
