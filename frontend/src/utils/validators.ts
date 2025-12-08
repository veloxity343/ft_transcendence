import { VALIDATION, ERROR_MESSAGES } from '../constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  username(value: string): ValidationResult {
    if (!value || value.length < VALIDATION.USERNAME_MIN_LENGTH) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.USERNAME_TOO_SHORT,
      };
    }
    
    if (value.length > VALIDATION.USERNAME_MAX_LENGTH) {
      return {
        isValid: false,
        error: `Username must be less than ${VALIDATION.USERNAME_MAX_LENGTH} characters.`,
      };
    }
    
    if (!VALIDATION.USERNAME_REGEX.test(value)) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INVALID_USERNAME,
      };
    }
    
    return { isValid: true };
  },

  email(value: string): ValidationResult {
    if (!value || !VALIDATION.EMAIL_REGEX.test(value)) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INVALID_EMAIL,
      };
    }
    
    // Check for valid email domain
    // const validDomains = [
    //   'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    //   'icloud.com', 'protonmail.com', 'aol.com', 'mail.com',
    //   'zoho.com', 'yandex.com', 'gmx.com', 'fastmail.com'
    // ];
    
    // const emailLower = value.toLowerCase();
    // const hasValidDomain = validDomains.some(domain => emailLower.endsWith(`@${domain}`));
    
    // if (!hasValidDomain) {
    //   return {
    //     isValid: false,
    //     error: 'Please use a valid email provider',
    //   };
    // }
    
    return { isValid: true };
  },

  password(value: string): ValidationResult {
    if (!value || value.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.PASSWORD_TOO_SHORT,
      };
    }
    
    if (value.length > VALIDATION.PASSWORD_MAX_LENGTH) {
      return {
        isValid: false,
        error: `Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters.`,
      };
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(value)) {
      return {
        isValid: false,
        error: 'Password must contain at least one uppercase letter',
      };
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(value)) {
      return {
        isValid: false,
        error: 'Password must contain at least one lowercase letter',
      };
    }
    
    // Check for number
    if (!/[0-9]/.test(value)) {
      return {
        isValid: false,
        error: 'Password must contain at least one number',
      };
    }
    
    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      return {
        isValid: false,
        error: 'Password must contain at least one special character',
      };
    }
    
    return { isValid: true };
  },

  passwordMatch(password: string, confirmPassword: string): ValidationResult {
    if (password !== confirmPassword) {
      return {
        isValid: false,
        error: 'Passwords must match.',
      };
    }
    
    return { isValid: true };
  },
};

// Utility function to validate form data
export function validateForm(
  fields: Record<string, string>,
  rules: Record<string, (value: string) => ValidationResult>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [field, value] of Object.entries(fields)) {
    const validator = rules[field];
    if (validator) {
      const result = validator(value);
      if (!result.isValid) {
        isValid = false;
        errors[field] = result.error || 'Invalid input';
      }
    }
  }

  return { isValid, errors };
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Sanitize HTML to prevent XSS
export function sanitizeHTML(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format duration (seconds to MM:SS)
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Calculate win rate
export function calculateWinRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}
