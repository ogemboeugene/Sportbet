import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfigService {
  private readonly logger = new Logger(SecurityConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get security configuration for the application
   */
  getSecurityConfig() {
    return {
      // HTTPS and TLS Configuration
      https: {
        enforced: this.configService.get('NODE_ENV') === 'production',
        redirectHttpToHttps: true,
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
      },

      // Content Security Policy
      csp: {
        enabled: true,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // Rate Limiting Configuration
      rateLimiting: {
        global: {
          windowMs: this.configService.get('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
          maxRequests: this.configService.get('RATE_LIMIT_MAX_REQUESTS', 100),
        },
        auth: {
          windowMs: 300000, // 5 minutes
          maxRequests: 5,
        },
        api: {
          windowMs: 60000, // 1 minute
          maxRequests: 60,
        },
        fileUpload: {
          windowMs: 300000, // 5 minutes
          maxRequests: 10,
        },
      },

      // Input Validation and Sanitization
      validation: {
        maxBodySize: '1mb',
        maxUrlLength: 2048,
        maxHeaderSize: 8192,
        allowedFileTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
        ],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        sanitization: {
          stripHtml: true,
          escapeHtml: true,
          removeScripts: true,
          removeNullBytes: true,
        },
      },

      // CSRF Protection
      csrf: {
        enabled: true,
        cookieName: '_csrf',
        headerName: 'x-csrf-token',
        tokenLength: 32,
        sameSite: 'strict',
        secure: this.configService.get('NODE_ENV') === 'production',
        httpOnly: true,
      },

      // Session Security
      session: {
        name: 'sportbet.sid',
        secret: this.configService.get('SESSION_SECRET'),
        secure: this.configService.get('NODE_ENV') === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
        rolling: true,
      },

      // Password Security
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        bcryptRounds: this.configService.get('BCRYPT_ROUNDS', 12),
      },

      // Encryption Configuration
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        keyRotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
        pciCompliant: true,
      },

      // Audit and Logging
      audit: {
        enabled: true,
        retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
        integrityChecking: true,
        tamperDetection: true,
        realTimeAlerts: true,
        logLevels: ['error', 'warn', 'info', 'debug'],
      },

      // Threat Detection
      threatDetection: {
        enabled: true,
        ipWhitelist: this.getIpWhitelist(),
        ipBlacklist: this.getIpBlacklist(),
        geoBlocking: {
          enabled: false,
          blockedCountries: [],
        },
        patternDetection: {
          bruteForce: true,
          sqlInjection: true,
          xss: true,
          ddos: true,
          botDetection: true,
        },
        alertThresholds: {
          low: 10,
          medium: 25,
          high: 50,
          critical: 100,
        },
      },

      // Data Protection
      dataProtection: {
        encryption: {
          atRest: true,
          inTransit: true,
          fieldLevel: true,
        },
        anonymization: {
          enabled: true,
          retentionPeriod: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
          methods: ['hashing', 'pseudonymization', 'generalization'],
        },
        pciDss: {
          compliant: true,
          tokenization: true,
          vaultStorage: true,
        },
      },

      // File Security
      fileSecurity: {
        virusScanning: true,
        contentValidation: true,
        sizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'text/plain',
        ],
        quarantinePath: '/tmp/quarantine',
        scanTimeout: 30000, // 30 seconds
      },

      // Compliance
      compliance: {
        gdpr: true,
        ccpa: true,
        pciDss: true,
        sox: true,
        iso27001: true,
      },

      // Monitoring and Alerting
      monitoring: {
        realTimeMonitoring: true,
        alertChannels: ['email', 'sms', 'webhook'],
        healthChecks: {
          interval: 60000, // 1 minute
          timeout: 10000, // 10 seconds
        },
        metrics: {
          performance: true,
          security: true,
          business: true,
        },
      },
    };
  }

  /**
   * Get IP whitelist from configuration
   */
  private getIpWhitelist(): string[] {
    const whitelist = this.configService.get('IP_WHITELIST', '');
    return whitelist ? whitelist.split(',').map(ip => ip.trim()) : [];
  }

  /**
   * Get IP blacklist from configuration
   */
  private getIpBlacklist(): string[] {
    const blacklist = this.configService.get('IP_BLACKLIST', '');
    return blacklist ? blacklist.split(',').map(ip => ip.trim()) : [];
  }

  /**
   * Validate security configuration
   */
  validateConfiguration(): boolean {
    const config = this.getSecurityConfig();
    let isValid = true;

    // Validate required environment variables
    const requiredVars = [
      'JWT_SECRET',
      'BCRYPT_ROUNDS',
      'ENCRYPTION_KEY',
    ];

    for (const variable of requiredVars) {
      if (!this.configService.get(variable)) {
        this.logger.error(`Missing required environment variable: ${variable}`);
        isValid = false;
      }
    }

    // Validate security settings
    if (config.password.bcryptRounds < 10) {
      this.logger.warn('Bcrypt rounds should be at least 10 for production');
    }

    if (config.session.secret && config.session.secret.length < 32) {
      this.logger.warn('Session secret should be at least 32 characters long');
    }

    return isValid;
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': this.buildCspHeader(),
    };
  }

  /**
   * Build Content Security Policy header
   */
  private buildCspHeader(): string {
    const config = this.getSecurityConfig();
    const directives = config.csp.directives;
    
    return Object.entries(directives)
      .map(([key, values]) => {
        const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${directive} ${Array.isArray(values) ? values.join(' ') : values}`;
      })
      .join('; ');
  }

  /**
   * Initialize security monitoring
   */
  initializeSecurityMonitoring(): void {
    this.logger.log('Initializing security monitoring...');
    
    // Log security configuration status
    const config = this.getSecurityConfig();
    this.logger.log(`Security features enabled:`);
    this.logger.log(`- HTTPS enforcement: ${config.https.enforced}`);
    this.logger.log(`- CSRF protection: ${config.csrf.enabled}`);
    this.logger.log(`- Threat detection: ${config.threatDetection.enabled}`);
    this.logger.log(`- Audit logging: ${config.audit.enabled}`);
    this.logger.log(`- File security: ${config.fileSecurity.virusScanning}`);
    this.logger.log(`- Data encryption: ${config.dataProtection.encryption.atRest}`);
    
    // Validate configuration
    if (!this.validateConfiguration()) {
      this.logger.error('Security configuration validation failed!');
    } else {
      this.logger.log('✅ Security configuration validated successfully');
    }
  }
}
