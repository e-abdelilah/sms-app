export const MAX_PHONE_INPUT_LENGTH = 32;
export const MESSAGE_MAX_LENGTH = 320;

export type ValidationResult =
  | { isValid: true; value: string }
  | { error: string; isValid: false };

const allowedPhoneCharacters = /^\+?[0-9 ()-]+$/;
const forbiddenMessageControls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function normalizePhoneNumber(value: string) {
  const trimmedValue = value.trim();
  const digits = trimmedValue.replace(/\D/g, '');
  return trimmedValue.startsWith('+') ? `+${digits}` : digits;
}

export function validatePhoneNumber(value: string): ValidationResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { error: 'Le numéro du destinataire est obligatoire.', isValid: false };
  }

  if (trimmedValue.length > MAX_PHONE_INPUT_LENGTH) {
    return {
      error: `Le numéro ne peut pas dépasser ${MAX_PHONE_INPUT_LENGTH} caractères.`,
      isValid: false,
    };
  }

  if (!allowedPhoneCharacters.test(trimmedValue)) {
    return {
      error: 'Utilisez uniquement des chiffres, espaces, parenthèses, tirets et un + initial.',
      isValid: false,
    };
  }

  const normalizedValue = normalizePhoneNumber(trimmedValue);
  const digitCount = normalizedValue.startsWith('+')
    ? normalizedValue.length - 1
    : normalizedValue.length;

  if (digitCount < 8 || digitCount > 15) {
    return { error: 'Le numéro doit contenir entre 8 et 15 chiffres.', isValid: false };
  }

  return { isValid: true, value: normalizedValue };
}

export function validateMessageBody(value: string): ValidationResult {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { error: 'Le message ne peut pas être vide.', isValid: false };
  }

  if (value.length > MESSAGE_MAX_LENGTH) {
    return {
      error: `Le message ne peut pas dépasser ${MESSAGE_MAX_LENGTH} caractères.`,
      isValid: false,
    };
  }

  if (forbiddenMessageControls.test(value)) {
    return { error: 'Le message contient un caractère de contrôle interdit.', isValid: false };
  }

  return { isValid: true, value: trimmedValue };
}
