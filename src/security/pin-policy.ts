/** PIN format used by the application lock. */
export const PIN_LENGTH = 6;

const pinPattern = new RegExp(`^[0-9]{${PIN_LENGTH}}$`);

export function isValidPin(pin: string) {
  return pinPattern.test(pin);
}
