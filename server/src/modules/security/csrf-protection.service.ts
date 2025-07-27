import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CsrfProtectionService {
  private readonly logger = new Logger(CsrfProtectionService.name);
  private readonly secret: string;
  private readonly tokenExpiry: number;

  constructor(private configService: ConfigService) {
    this.secret = this.configService.get<string>('CSRF_SECRET') || crypto.randomBytes(32).toString('hex');
    this.tokenExpiry = this.configService.get<number>('CSRF_TOKEN_EXPIRY', 3600000); // 1 hour
  }

  /**
   * Generate a CSRF token for a user session
   */
  generateToken(sessionId: string, userId?: string): string {
    try {
      const payload = {
        sessionId,
        userId,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex'),
      };

      return jwt.sign(payload, this.secret, {
        expiresIn: Math.floor(this.tokenExpiry / 1000), // Convert to seconds
        issuer: 'sportbet-csrf',
        audience: 'sportbet-api',
      });
    } catch (error) {
      this.logger.error('Failed to generate CSRF token', error.stack);
      throw new Error('CSRF token generation failed');
    }
  }

  /**
   * Validate a CSRF token
   */
  validateToken(token: string, sessionId: string, userId?: string): boolean {
    try {
      if (!token || typeof token !== 'string') {
        return false;
      }

      const decoded = jwt.verify(token, this.secret, {
        issuer: 'sportbet-csrf',
        audience: 'sportbet-api',
      }) as any;

      // Check if the session ID matches
      if (decoded.sessionId !== sessionId) {
        this.logger.warn('CSRF token session mismatch', {
          expectedSession: sessionId,
          tokenSession: decoded.sessionId,
        });
        return false;
      }

      // Check if the user ID matches (if provided)
      if (userId && decoded.userId !== userId) {
        this.logger.warn('CSRF token user mismatch', {
          expectedUser: userId,
          tokenUser: decoded.userId,
        });
        return false;
      }

      // Check token age (additional check beyond JWT expiry)
      const tokenAge = Date.now() - decoded.timestamp;
      if (tokenAge > this.tokenExpiry) {
        this.logger.warn('CSRF token expired', {
          tokenAge,
          maxAge: this.tokenExpiry,
        });
        return false;
      }

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.debug('CSRF token expired');
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.warn('Invalid CSRF token format', error.message);
      } else {
        this.logger.error('CSRF token validation error', error.stack);
      }
      return false;
    }
  }

  /**
   * Extract CSRF token from request headers or body
   */
  extractTokenFromRequest(request: any): string | null {
    // Check various possible locations for CSRF token
    const sources = [
      request.headers['x-csrf-token'],
      request.headers['x-xsrf-token'], // Common alternative name
      request.body?._csrf,
      request.query?._csrf,
      request.cookies?.['csrf-token'],
    ];

    for (const source of sources) {
      if (source && typeof source === 'string') {
        return source;
      }
    }

    return null;
  }

  /**
   * Generate a double-submit cookie token pair
   */
  generateDoubleSubmitTokens(sessionId: string, userId?: string): {
    csrfToken: string;
    cookieToken: string;
  } {
    const basePayload = {
      sessionId,
      userId,
      timestamp: Date.now(),
    };

    // Generate the main CSRF token
    const csrfToken = this.generateToken(sessionId, userId);

    // Generate a matching cookie token with same payload but different secret
    const cookieSecret = crypto.createHmac('sha256', this.secret).update('cookie').digest('hex');
    const cookieToken = jwt.sign(basePayload, cookieSecret, {
      expiresIn: Math.floor(this.tokenExpiry / 1000),
      issuer: 'sportbet-csrf-cookie',
      audience: 'sportbet-api',
    });

    return { csrfToken, cookieToken };
  }

  /**
   * Validate double-submit tokens
   */
  validateDoubleSubmitTokens(
    csrfToken: string,
    cookieToken: string,
    sessionId: string,
    userId?: string
  ): boolean {
    try {
      // Validate the main CSRF token
      if (!this.validateToken(csrfToken, sessionId, userId)) {
        return false;
      }

      // Validate the cookie token
      const cookieSecret = crypto.createHmac('sha256', this.secret).update('cookie').digest('hex');
      const decoded = jwt.verify(cookieToken, cookieSecret, {
        issuer: 'sportbet-csrf-cookie',
        audience: 'sportbet-api',
      }) as any;

      // Verify the cookie token matches the CSRF token's payload
      if (decoded.sessionId !== sessionId) {
        return false;
      }

      if (userId && decoded.userId !== userId) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn('Double-submit token validation failed', error.message);
      return false;
    }
  }

  /**
   * Check if request is from same origin (additional CSRF protection)
   */
  validateSameOrigin(request: any): boolean {
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const host = request.headers.host;

    // Allow requests without origin/referer for API clients
    if (!origin && !referer) {
      return true;
    }

    const allowedOrigins = this.configService.get<string>('ALLOWED_ORIGINS', '').split(',');
    const serverHost = this.configService.get<string>('SERVER_HOST', host);

    // Check origin
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const isAllowed = allowedOrigins.includes(origin) || originUrl.host === serverHost;
        if (!isAllowed) {
          this.logger.warn('Origin not allowed', { origin, host });
          return false;
        }
      } catch (error) {
        this.logger.warn('Invalid origin header', { origin });
        return false;
      }
    }

    // Check referer
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const isAllowed = allowedOrigins.some(allowed => {
          try {
            const allowedUrl = new URL(allowed);
            return allowedUrl.host === refererUrl.host;
          } catch {
            return false;
          }
        }) || refererUrl.host === serverHost;

        if (!isAllowed) {
          this.logger.warn('Referer not allowed', { referer, host });
          return false;
        }
      } catch (error) {
        this.logger.warn('Invalid referer header', { referer });
        return false;
      }
    }

    return true;
  }

  /**
   * Generate state parameter for OAuth flows
   */
  generateOAuthState(sessionId: string, provider: string, redirectUrl?: string): string {
    const payload = {
      sessionId,
      provider,
      redirectUrl,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: 600, // 10 minutes for OAuth flows
      issuer: 'sportbet-oauth',
      audience: 'sportbet-api',
    });
  }

  /**
   * Validate OAuth state parameter
   */
  validateOAuthState(state: string, sessionId: string, provider: string): {
    isValid: boolean;
    redirectUrl?: string;
  } {
    try {
      const decoded = jwt.verify(state, this.secret, {
        issuer: 'sportbet-oauth',
        audience: 'sportbet-api',
      }) as any;

      if (decoded.sessionId !== sessionId || decoded.provider !== provider) {
        return { isValid: false };
      }

      return {
        isValid: true,
        redirectUrl: decoded.redirectUrl,
      };
    } catch (error) {
      this.logger.warn('OAuth state validation failed', error.message);
      return { isValid: false };
    }
  }

  /**
   * Create secure random token for general use
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create time-limited secure token with embedded expiry
   */
  generateTimeLimitedToken(data: any, expiryMinutes: number = 60): string {
    const payload = {
      data,
      exp: Math.floor(Date.now() / 1000) + (expiryMinutes * 60),
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    return jwt.sign(payload, this.secret, {
      issuer: 'sportbet-secure',
      audience: 'sportbet-api',
    });
  }

  /**
   * Validate time-limited secure token
   */
  validateTimeLimitedToken(token: string): { isValid: boolean; data?: any } {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'sportbet-secure',
        audience: 'sportbet-api',
      }) as any;

      return {
        isValid: true,
        data: decoded.data,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Rate limiting for CSRF token generation
   */
  private tokenGenerationLimits = new Map<string, { count: number; resetTime: number }>();

  canGenerateToken(identifier: string, maxTokensPerHour: number = 100): boolean {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    
    const current = this.tokenGenerationLimits.get(identifier);
    
    if (!current || now > current.resetTime) {
      this.tokenGenerationLimits.set(identifier, {
        count: 1,
        resetTime: now + hourMs,
      });
      return true;
    }

    if (current.count >= maxTokensPerHour) {
      this.logger.warn('CSRF token generation rate limit exceeded', { identifier });
      return false;
    }

    current.count++;
    return true;
  }

  /**
   * Clear expired rate limiting entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, value] of this.tokenGenerationLimits.entries()) {
      if (now > value.resetTime) {
        this.tokenGenerationLimits.delete(key);
      }
    }
  }
}
