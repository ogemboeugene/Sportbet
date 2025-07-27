import { Injectable, Logger } from '@nestjs/common';
// import * as DOMPurify from 'isomorphic-dompurify';
import { escape } from 'html-escaper';
import * as validator from 'validator';

@Injectable()
export class InputSanitizationService {
  private readonly logger = new Logger(InputSanitizationService.name);

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    try {
      // Use basic HTML escaping instead of DOMPurify
      return escape(html);
    } catch (error) {
      this.logger.error('HTML sanitization failed', error.stack);
      return escape(html); // Fallback to basic escaping
    }
  }

  /**
   * Escape HTML entities to prevent XSS
   */
  escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return escape(text);
  }

  /**
   * Sanitize SQL input to prevent SQL injection
   */
  sanitizeSql(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous SQL keywords and characters
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/gi,
      /(--|\||;|\/\*|\*\/|xp_|sp_)/gi,
      /(\b(OR|AND)\s+['"]\s*['"]\s*=\s*['"])/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    ];

    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized.trim();
  }

  /**
   * Validate and sanitize email addresses
   */
  sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const trimmed = email.trim().toLowerCase();
    
    if (!validator.isEmail(trimmed)) {
      return null;
    }

    return trimmed;
  }

  /**
   * Sanitize phone numbers
   */
  sanitizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    // Remove all non-digit characters except + for international numbers
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    if (!validator.isMobilePhone(cleaned, 'any', { strictMode: false })) {
      return null;
    }

    return cleaned;
  }

  /**
   * Sanitize URLs to prevent various attacks
   */
  sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    const trimmed = url.trim();

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
    const lowerUrl = trimmed.toLowerCase();
    
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return null;
    }

    if (!validator.isURL(trimmed, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_host: true,
      require_valid_protocol: true,
    })) {
      return null;
    }

    return trimmed;
  }

  /**
   * Sanitize file names to prevent path traversal attacks
   */
  sanitizeFileName(fileName: string): string | null {
    if (!fileName || typeof fileName !== 'string') {
      return null;
    }

    // Remove dangerous characters and patterns
    const dangerous = [
      /\.\./g,           // Path traversal
      /[<>:"|?*]/g,      // Windows invalid characters
      /[\x00-\x1f]/g,    // Control characters
      /^\./,             // Hidden files
      /\.$/,             // Trailing dot
      /\s+$/,            // Trailing whitespace
    ];

    let sanitized = fileName.trim();
    
    dangerous.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Ensure filename is not empty and has reasonable length
    if (!sanitized || sanitized.length === 0 || sanitized.length > 255) {
      return null;
    }

    // Check for reserved names (Windows)
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
    
    if (reserved.includes(nameWithoutExt)) {
      return null;
    }

    return sanitized;
  }

  /**
   * Sanitize an object recursively (public method for middleware)
   */
  public sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeHtml(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeHtml(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize JSON input to prevent JSON injection
   */
  sanitizeJson(jsonString: string): any | null {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Recursively sanitize the parsed object
      return this.sanitizeObject(parsed);
    } catch (error) {
      this.logger.warn('Invalid JSON input detected', { input: jsonString.substring(0, 100) });
      return null;
    }
  }

  /**
   * Sanitize object property names
   */
  private sanitizePropertyName(name: string): string | null {
    if (!name || typeof name !== 'string') {
      return null;
    }

    // Remove dangerous characters from property names
    const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (sanitized.length === 0 || sanitized.length > 50) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize numeric input
   */
  sanitizeNumber(input: any, options: {
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}): number | null {
    if (input === null || input === undefined || input === '') {
      return null;
    }

    let num: number;

    if (typeof input === 'string') {
      // Remove any non-numeric characters except decimal point and minus sign
      const cleaned = input.replace(/[^0-9.-]/g, '');
      num = parseFloat(cleaned);
    } else if (typeof input === 'number') {
      num = input;
    } else {
      return null;
    }

    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    // Check if integer is required
    if (options.integer && !Number.isInteger(num)) {
      return null;
    }

    // Check bounds
    if (options.min !== undefined && num < options.min) {
      return null;
    }

    if (options.max !== undefined && num > options.max) {
      return null;
    }

    return num;
  }

  /**
   * Sanitize and validate credit card numbers (for logging, not storage)
   */
  sanitizeCreditCard(cardNumber: string): string | null {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return null;
    }

    // Remove all non-digit characters
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Validate length (13-19 digits for most cards)
    if (cleaned.length < 13 || cleaned.length > 19) {
      return null;
    }

    // For security, only return masked version
    if (cleaned.length >= 4) {
      return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
    }

    return null;
  }

  /**
   * Sanitize search queries to prevent NoSQL injection
   */
  sanitizeSearchQuery(query: string): string | null {
    if (!query || typeof query !== 'string') {
      return null;
    }

    // Remove MongoDB operators and dangerous patterns
    const dangerous = [
      /\$\w+/g,           // MongoDB operators ($where, $regex, etc.)
      /[{}]/g,            // Object notation
      /eval\s*\(/gi,      // eval functions
      /function\s*\(/gi,  // function definitions
      /this\./gi,         // this references
    ];

    let sanitized = query.trim();
    
    dangerous.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Limit length
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100);
    }

    return sanitized.length > 0 ? sanitized : null;
  }

  /**
   * Comprehensive input validation for user registration data
   */
  validateRegistrationData(data: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    country?: string;
  }): {
    isValid: boolean;
    sanitized: any;
    errors: string[];
  } {
    const errors: string[] = [];
    const sanitized: any = {};

    // Email validation
    if (data.email) {
      const sanitizedEmail = this.sanitizeEmail(data.email);
      if (sanitizedEmail) {
        sanitized.email = sanitizedEmail;
      } else {
        errors.push('Invalid email format');
      }
    } else {
      errors.push('Email is required');
    }

    // Password validation (basic - detailed validation should use SecurityService)
    if (data.password) {
      if (data.password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      } else {
        sanitized.password = data.password; // Don't sanitize passwords, just validate
      }
    } else {
      errors.push('Password is required');
    }

    // Name validation
    if (data.firstName) {
      const sanitizedFirstName = this.escapeHtml(data.firstName.trim());
      if (sanitizedFirstName.length > 0 && sanitizedFirstName.length <= 50) {
        sanitized.firstName = sanitizedFirstName;
      } else {
        errors.push('Invalid first name');
      }
    } else {
      errors.push('First name is required');
    }

    if (data.lastName) {
      const sanitizedLastName = this.escapeHtml(data.lastName.trim());
      if (sanitizedLastName.length > 0 && sanitizedLastName.length <= 50) {
        sanitized.lastName = sanitizedLastName;
      } else {
        errors.push('Invalid last name');
      }
    } else {
      errors.push('Last name is required');
    }

    // Phone number validation
    if (data.phoneNumber) {
      const sanitizedPhone = this.sanitizePhoneNumber(data.phoneNumber);
      if (sanitizedPhone) {
        sanitized.phoneNumber = sanitizedPhone;
      } else {
        errors.push('Invalid phone number format');
      }
    }

    // Date of birth validation
    if (data.dateOfBirth) {
      const date = new Date(data.dateOfBirth);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      
      if (isNaN(date.getTime()) || age < 18 || age > 120) {
        errors.push('Invalid date of birth (must be 18+ years old)');
      } else {
        sanitized.dateOfBirth = date;
      }
    }

    // Country validation
    if (data.country) {
      const sanitizedCountry = this.escapeHtml(data.country.trim());
      if (sanitizedCountry.length > 0 && sanitizedCountry.length <= 50) {
        sanitized.country = sanitizedCountry;
      } else {
        errors.push('Invalid country');
      }
    } else {
      errors.push('Country is required');
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors,
    };
  }
}
