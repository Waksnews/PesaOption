/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

/**
 * Validates password strength rules for the frontend interface
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('At least 8 characters required');
  if (!hasUppercase) errors.push('At least 1 uppercase letter required');
  if (!hasLowercase) errors.push('At least 1 lowercase letter required');
  if (!hasNumber) errors.push('At least 1 number required');
  if (!hasSpecialChar) errors.push('At least 1 special character required');

  return {
    isValid: errors.length === 0,
    errors,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
}
