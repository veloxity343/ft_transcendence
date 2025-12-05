import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { FastifyReply } from 'fastify';

export async function validateDto<T extends object>(
  DtoClass: new () => T,
  body: any,
  reply: FastifyReply
): Promise<T | null> {
  // Convert plain object to class instance
  const dto = plainToInstance(DtoClass, body);
  
  // Validate
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const formattedErrors = formatValidationErrors(errors);
    
    reply.code(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      errors: formattedErrors,
    });
    
    return null;
  }

  return dto;
}

/**
 * Format validation errors into a readable format
 */
function formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const error of errors) {
    const property = error.property;
    const constraints = error.constraints;

    if (constraints) {
      formatted[property] = Object.values(constraints);
    }

    // Handle nested validation errors
    if (error.children && error.children.length > 0) {
      const nestedErrors = formatValidationErrors(error.children);
      for (const [key, value] of Object.entries(nestedErrors)) {
        formatted[`${property}.${key}`] = value;
      }
    }
  }

  return formatted;
}

/**
 * Sanitize a string to prevent XSS attacks
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  // 3-20 characters, alphanumeric, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  // Optional: Add more password requirements
  // const hasUpperCase = /[A-Z]/.test(password);
  // const hasLowerCase = /[a-z]/.test(password);
  // const hasNumbers = /\d/.test(password);
  // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return { valid: true };
}
