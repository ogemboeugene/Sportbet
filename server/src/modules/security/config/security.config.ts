export interface SecurityConfig {
  // HTTPS and SSL/TLS Configuration
  https: {
    enabled: boolean;
    forceHttps: boolean;
    hstsMaxAge: number;
    includeSubdomains: boolean;
    preload: boolean;
  };

  // CORS Configuration
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };

  // CSRF Protection
  csrf: {
    enabled: boolean;
    tokenLength: number;
    cookieName: string;
    headerName: string;
    sameSitePolicy: 'strict' | 'lax' | 'none';
    secure: boolean;
    httpOnly: boolean;
    maxAge: number;
  };

  // Rate Limiting
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator?: string;
  };

  // Input Validation and Sanitization
  inputSanitization: {
    enabled: boolean;
    xssProtection: boolean;
    sqlInjectionProtection: boolean;
    noSqlInjectionProtection: boolean;
    maxStringLength: number;
    allowedFileTypes: string[];
    maxFileSize: number;
  };

  // Encryption Configuration
  encryption: {
    algorithm: string;
    keyDerivation: {
      algorithm: string;
      iterations: number;
      keyLength: number;
      digest: string;
    };
    aes: {
      keySize: number;
      ivLength: number;
    };
    bcrypt: {
      rounds: number;
    };
    secretRotation: {
      enabled: boolean;
      intervalDays: number;
    };
  };

  // Session Security
  session: {
    secret: string;
    name: string;
    cookie: {
      maxAge: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    };
    resave: boolean;
    saveUninitialized: boolean;
  };

  // File Upload Security
  fileUpload: {
    enabled: boolean;
    maxSize: number;
    allowedMimeTypes: string[];
    allowedExtensions: string[];
    virusScanning: {
      enabled: boolean;
      provider: string;
      quarantineDirectory: string;
    };
    encryption: {
      enabled: boolean;
      algorithm: string;
    };
  };

  // Threat Detection
  threatDetection: {
    enabled: boolean;
    bruteForce: {
      enabled: boolean;
      maxAttempts: number;
      windowMs: number;
      blockDurationMs: number;
    };
    ddosProtection: {
      enabled: boolean;
      threshold: number;
      windowMs: number;
    };
    sqlInjection: {
      enabled: boolean;
      patterns: string[];
    };
    xssDetection: {
      enabled: boolean;
      patterns: string[];
    };
    anomalyDetection: {
      enabled: boolean;
      thresholds: {
        requestVolume: number;
        errorRate: number;
        responseTime: number;
      };
    };
  };

  // Audit Logging
  audit: {
    enabled: boolean;
    categories: string[];
    retentionPeriods: Record<string, number>;
    integrityChecking: boolean;
    compression: boolean;
    encryption: boolean;
    complianceReporting: boolean;
  };

  // Incident Response
  incidentResponse: {
    enabled: boolean;
    autoResponse: {
      enabled: boolean;
      actions: {
        blockIp: boolean;
        disableUser: boolean;
        alertAdmins: boolean;
        quarantineFiles: boolean;
      };
    };
    notifications: {
      email: {
        enabled: boolean;
        recipients: string[];
      };
      slack: {
        enabled: boolean;
        webhook: string;
      };
      sms: {
        enabled: boolean;
        recipients: string[];
      };
    };
  };

  // Compliance Settings
  compliance: {
    gdpr: {
      enabled: boolean;
      dataRetentionDays: number;
      rightToErasure: boolean;
      dataPortability: boolean;
    };
    pciDss: {
      enabled: boolean;
      level: 1 | 2 | 3 | 4;
      tokenization: boolean;
      encryptionAtRest: boolean;
      encryptionInTransit: boolean;
    };
    sox: {
      enabled: boolean;
      auditTrail: boolean;
      changeManagement: boolean;
    };
  };

  // Security Headers
  headers: {
    xFrameOptions: string;
    xContentTypeOptions: boolean;
    xXssProtection: string;
    strictTransportSecurity: string;
    contentSecurityPolicy: string;
    referrerPolicy: string;
    permissionsPolicy: string;
    crossOriginEmbedderPolicy: string;
    crossOriginOpenerPolicy: string;
    crossOriginResourcePolicy: string;
  };

  // API Security
  api: {
    versioning: {
      enabled: boolean;
      type: 'uri' | 'header' | 'query';
      deprecationNotice: boolean;
    };
    authentication: {
      jwt: {
        enabled: boolean;
        expiresIn: string;
        refreshTokenExpiry: string;
        algorithm: string;
      };
      apiKey: {
        enabled: boolean;
        headerName: string;
        queryParamName: string;
      };
    };
    documentation: {
      swagger: {
        enabled: boolean;
        path: string;
        authentication: boolean;
      };
    };
  };
}

export const defaultSecurityConfig: SecurityConfig = {
  https: {
    enabled: true,
    forceHttps: true,
    hstsMaxAge: 31536000, // 1 year
    includeSubdomains: true,
    preload: true,
  },

  cors: {
    enabled: true,
    origins: ['http://localhost:3000', 'https://sportbet.com'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
  },

  csrf: {
    enabled: true,
    tokenLength: 32,
    cookieName: '_csrf',
    headerName: 'X-CSRF-Token',
    sameSitePolicy: 'strict',
    secure: true,
    httpOnly: true,
    maxAge: 3600000, // 1 hour
  },

  rateLimit: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  inputSanitization: {
    enabled: true,
    xssProtection: true,
    sqlInjectionProtection: true,
    noSqlInjectionProtection: true,
    maxStringLength: 10000,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFileSize: 10485760, // 10MB
  },

  encryption: {
    algorithm: 'AES-256-GCM',
    keyDerivation: {
      algorithm: 'PBKDF2',
      iterations: 100000,
      keyLength: 32,
      digest: 'sha256',
    },
    aes: {
      keySize: 32,
      ivLength: 16,
    },
    bcrypt: {
      rounds: 12,
    },
    secretRotation: {
      enabled: true,
      intervalDays: 90,
    },
  },

  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
    name: 'sportbet.sid',
    cookie: {
      maxAge: 86400000, // 24 hours
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    },
    resave: false,
    saveUninitialized: false,
  },

  fileUpload: {
    enabled: true,
    maxSize: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    virusScanning: {
      enabled: true,
      provider: 'clamav',
      quarantineDirectory: '/tmp/quarantine',
    },
    encryption: {
      enabled: true,
      algorithm: 'AES-256-GCM',
    },
  },

  threatDetection: {
    enabled: true,
    bruteForce: {
      enabled: true,
      maxAttempts: 5,
      windowMs: 900000, // 15 minutes
      blockDurationMs: 3600000, // 1 hour
    },
    ddosProtection: {
      enabled: true,
      threshold: 1000,
      windowMs: 60000, // 1 minute
    },
    sqlInjection: {
      enabled: true,
      patterns: [
        "('|(\\(|(\\)|;|\\||\\*|AND|OR|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)",
        "(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\\s",
        "UNION\\s+(ALL\\s+)?SELECT",
        "(--|#|/\\*|\\*/|@@|@)",
      ],
    },
    xssDetection: {
      enabled: true,
      patterns: [
        "<script[^>]*>.*?</script>",
        "javascript:",
        "vbscript:",
        "onload=",
        "onerror=",
        "onclick=",
        "onmouseover=",
      ],
    },
    anomalyDetection: {
      enabled: true,
      thresholds: {
        requestVolume: 1000,
        errorRate: 0.1, // 10%
        responseTime: 5000, // 5 seconds
      },
    },
  },

  audit: {
    enabled: true,
    categories: [
      'authentication',
      'authorization',
      'data_access',
      'data_modification',
      'system_access',
      'configuration',
      'security_event',
    ],
    retentionPeriods: {
      authentication: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      authorization: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      data_access: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      data_modification: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
      system_access: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
      configuration: 3 * 365 * 24 * 60 * 60 * 1000, // 3 years
      security_event: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
    },
    integrityChecking: true,
    compression: true,
    encryption: true,
    complianceReporting: true,
  },

  incidentResponse: {
    enabled: true,
    autoResponse: {
      enabled: true,
      actions: {
        blockIp: true,
        disableUser: true,
        alertAdmins: true,
        quarantineFiles: true,
      },
    },
    notifications: {
      email: {
        enabled: true,
        recipients: ['security@sportbet.com', 'admin@sportbet.com'],
      },
      slack: {
        enabled: true,
        webhook: process.env.SLACK_SECURITY_WEBHOOK || '',
      },
      sms: {
        enabled: false,
        recipients: [],
      },
    },
  },

  compliance: {
    gdpr: {
      enabled: true,
      dataRetentionDays: 2555, // 7 years
      rightToErasure: true,
      dataPortability: true,
    },
    pciDss: {
      enabled: true,
      level: 1,
      tokenization: true,
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
    sox: {
      enabled: true,
      auditTrail: true,
      changeManagement: true,
    },
  },

  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
    xXssProtection: '1; mode=block',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:; frame-ancestors 'none';",
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    crossOriginEmbedderPolicy: 'require-corp',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin',
  },

  api: {
    versioning: {
      enabled: true,
      type: 'uri',
      deprecationNotice: true,
    },
    authentication: {
      jwt: {
        enabled: true,
        expiresIn: '15m',
        refreshTokenExpiry: '7d',
        algorithm: 'HS256',
      },
      apiKey: {
        enabled: true,
        headerName: 'X-API-Key',
        queryParamName: 'api_key',
      },
    },
    documentation: {
      swagger: {
        enabled: true,
        path: '/api/docs',
        authentication: true,
      },
    },
  },
};
