/**
 * Centralized Validation Utilities for FilmRoom
 * Reusable across Signup, Onboarding, and Profile settings.
 * Strictly deterministic — zero AI.
 */

/**
 * Validates a username according to FilmRoom standards:
 * - 3 to 30 characters
 * - Letters (a-z, A-Z), numbers (0-9), underscores (_), hyphens (-), periods (.)
 * - Cannot start or end with a period or hyphen
 * - Cannot contain consecutive periods
 * - Normalized to lowercase for uniqueness checks
 */
export function validateUsernameFormat(rawUsername) {
  if (!rawUsername || typeof rawUsername !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Username is required.',
    };
  }

  const clean = rawUsername.trim().replace(/^@+/, '');
  const normalized = clean.toLowerCase();

  if (clean.length === 0) {
    return {
      isValid: false,
      normalized: '',
      error: 'Username is required.',
    };
  }

  if (clean.length < 3) {
    return {
      isValid: false,
      normalized,
      error: 'Username must be at least 3 characters.',
    };
  }

  if (clean.length > 30) {
    return {
      isValid: false,
      normalized,
      error: 'Username cannot exceed 30 characters.',
    };
  }

  // Allowed characters: letters, numbers, underscore, period, hyphen
  const validCharsRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!validCharsRegex.test(clean)) {
    return {
      isValid: false,
      normalized,
      error: 'Username can only contain letters, numbers, underscores, and periods.',
    };
  }

  // Cannot start or end with a period or hyphen
  if (/^[.-]|[.-]$/.test(clean)) {
    return {
      isValid: false,
      normalized,
      error: 'Username cannot start or end with a period or hyphen.',
    };
  }

  // Cannot contain consecutive periods
  if (/\.\./.test(clean)) {
    return {
      isValid: false,
      normalized,
      error: 'Username cannot contain consecutive periods.',
    };
  }

  return {
    isValid: true,
    normalized,
    error: null,
  };
}

/**
 * Validates an email address format:
 * - Exactly one @ separator
 * - Non-empty local-part
 * - Non-empty domain with valid TLD structure
 * - No whitespace
 */
export function validateEmailFormat(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Email address is required.',
    };
  }

  const clean = rawEmail.trim();
  const normalized = clean.toLowerCase();

  if (clean.length === 0) {
    return {
      isValid: false,
      normalized: '',
      error: 'Email address is required.',
    };
  }

  // Whitespace check
  if (/\s/.test(clean)) {
    return {
      isValid: false,
      normalized,
      error: 'Email cannot contain spaces.',
    };
  }

  // Standard sensible RFC 5322 compatible regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(clean)) {
    return {
      isValid: false,
      normalized,
      error: 'Enter a valid email address.',
    };
  }

  // Ensure TLD is at least 2 characters
  const parts = clean.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      normalized,
      error: 'Enter a valid email address.',
    };
  }

  const domain = parts[1];
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      normalized,
      error: 'Enter a valid email address with a complete domain.',
    };
  }

  return {
    isValid: true,
    normalized,
    error: null,
  };
}

/**
 * Validates a password and produces itemized checklist states:
 * - Minimum 6 characters
 * - Contains at least one letter
 * - Contains at least one number
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
      error: 'Password is required.',
    };
  }

  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isValid = hasMinLength && hasLetter && hasNumber;

  let error = null;
  if (!hasMinLength) {
    error = 'Password must be at least 6 characters.';
  } else if (!hasLetter) {
    error = 'Password must contain at least one letter.';
  } else if (!hasNumber) {
    error = 'Password must contain at least one number.';
  }

  return {
    isValid,
    hasMinLength,
    hasLetter,
    hasNumber,
    error,
  };
}
