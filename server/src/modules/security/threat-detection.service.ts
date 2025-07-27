import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SecurityEvent, SecurityEventDocument } from '../../database/schemas/security-event.schema';
import { SecurityThreat, SecurityThreatDocument } from '../../database/schemas/security-threat.schema';

@Injectable()
export class ThreatDetectionService {
  private readonly logger = new Logger(ThreatDetectionService.name);
  
  // In-memory threat detection state
  private ipAttempts = new Map<string, { count: number; firstAttempt: number; methods: Set<string> }>();
  private userAttempts = new Map<string, { count: number; firstAttempt: number; ips: Set<string> }>();
  private suspiciousPatterns = new Map<string, number>();
  private activeThreats = new Set<string>();

  constructor(
    @InjectModel(SecurityEvent.name) private securityEventModel: Model<SecurityEventDocument>,
    @InjectModel(SecurityThreat.name) private securityThreatModel: Model<SecurityThreatDocument>,
  ) {
    // Clean up old tracking data every hour
    setInterval(() => this.cleanupOldData(), 60 * 60 * 1000);
  }

  /**
   * Analyze a security event for potential threats
   */
  async analyzeEvent(event: SecurityEventDocument): Promise<void> {
    try {
      // Analyze different types of threats
      await Promise.all([
        this.detectBruteForceAttacks(event),
        this.detectDDoSAttacks(event),
        this.detectSqlInjectionAttempts(event),
        this.detectXssAttempts(event),
        this.detectAnomalousUserBehavior(event),
        this.detectRateLimitViolations(event),
        this.detectSuspiciousGeolocation(event),
        this.detectAccountTakeover(event),
      ]);
    } catch (error) {
      this.logger.error('Error analyzing security event', error.stack);
    }
  }

  /**
   * Analyze a request for potential threats (public method for middleware)
   */
  public async analyzeRequest(requestData: {
    ipAddress: string;
    userAgent?: string;
    headers: Record<string, string>;
    body: any;
    method: string;
    url: string;
    userId?: string;
  }): Promise<Array<{ type: string; severity: 'low' | 'medium' | 'high' | 'critical'; confidence: number }>> {
    const threats: Array<{ type: string; severity: 'low' | 'medium' | 'high' | 'critical'; confidence: number }> = [];

    try {
      // Check for various threat patterns
      const requestContent = JSON.stringify({ body: requestData.body, url: requestData.url, headers: requestData.headers });

      // SQL Injection Detection
      if (this.detectSqlInjectionPattern(requestContent)) {
        threats.push({ type: 'sql_injection', severity: 'high', confidence: 0.8 });
      }

      // XSS Detection
      if (this.detectXssPattern(requestContent)) {
        threats.push({ type: 'xss', severity: 'high', confidence: 0.8 });
      }

      // Rate limit violations
      if (this.checkRateLimitViolation(requestData.ipAddress, requestData.method)) {
        threats.push({ type: 'rate_limit_violation', severity: 'medium', confidence: 0.9 });
      }

      // Suspicious user agent
      if (this.detectSuspiciousUserAgent(requestData.userAgent)) {
        threats.push({ type: 'suspicious_user_agent', severity: 'low', confidence: 0.6 });
      }

      // Path traversal
      if (this.detectPathTraversalPattern(requestData.url)) {
        threats.push({ type: 'path_traversal', severity: 'medium', confidence: 0.7 });
      }

      return threats;
    } catch (error) {
      this.logger.error('Error analyzing request for threats', error.stack);
      return [];
    }
  }

  /**
   * Detect brute force attacks
   */
  private async detectBruteForceAttacks(event: SecurityEventDocument): Promise<void> {
    if (event.type !== 'failed_login' && event.type !== 'authentication_failure') {
      return;
    }

    const ipKey = event.ipAddress;
    const userKey = event.userId?.toString();
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();

    // Track IP-based attempts
    const ipData = this.ipAttempts.get(ipKey) || { count: 0, firstAttempt: now, methods: new Set() };
    
    if (now - ipData.firstAttempt > timeWindow) {
      ipData.count = 1;
      ipData.firstAttempt = now;
      ipData.methods.clear();
    } else {
      ipData.count++;
    }
    
    ipData.methods.add(event.method || 'unknown');
    this.ipAttempts.set(ipKey, ipData);

    // Track user-based attempts
    if (userKey) {
      const userData = this.userAttempts.get(userKey) || { count: 0, firstAttempt: now, ips: new Set() };
      
      if (now - userData.firstAttempt > timeWindow) {
        userData.count = 1;
        userData.firstAttempt = now;
        userData.ips.clear();
      } else {
        userData.count++;
      }
      
      userData.ips.add(ipKey);
      this.userAttempts.set(userKey, userData);

      // Check for distributed brute force (same user from multiple IPs)
      if (userData.ips.size >= 3 && userData.count >= 10) {
        await this.createThreat({
          type: 'brute_force',
          severity: 'high',
          source: 'threat_detection',
          targetUserId: userKey,
          sourceIp: ipKey,
          indicators: {
            attemptCount: userData.count,
            uniqueIps: userData.ips.size,
            timeWindow: timeWindow,
            ips: Array.from(userData.ips),
          },
          evidence: {
            eventId: event._id,
            detectionTime: new Date(),
            pattern: 'distributed_brute_force',
          },
          attackVector: 'authentication',
          estimatedImpact: 'Account compromise attempt detected',
        });
      }
    }

    // Check for IP-based brute force
    if (ipData.count >= 20) {
      await this.createThreat({
        type: 'brute_force',
        severity: ipData.count >= 50 ? 'critical' : 'high',
        source: 'threat_detection',
        sourceIp: ipKey,
        indicators: {
          attemptCount: ipData.count,
          timeWindow: timeWindow,
          methods: Array.from(ipData.methods),
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'ip_brute_force',
        },
        attackVector: 'authentication',
        estimatedImpact: `${ipData.count} failed login attempts from single IP`,
      });
    }
  }

  /**
   * Detect DDoS attacks
   */
  private async detectDDoSAttacks(event: SecurityEventDocument): Promise<void> {
    if (event.type !== 'request' && event.type !== 'api_call') {
      return;
    }

    const ipKey = event.ipAddress;
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const requestThreshold = 1000; // requests per 5 minutes

    // Get recent requests from this IP
    const recentRequests = await this.securityEventModel.countDocuments({
      ipAddress: ipKey,
      detectedAt: { $gte: new Date(Date.now() - timeWindow) },
      type: { $in: ['request', 'api_call'] },
    });

    if (recentRequests >= requestThreshold) {
      await this.createThreat({
        type: 'ddos',
        severity: recentRequests >= 2000 ? 'critical' : 'high',
        source: 'threat_detection',
        sourceIp: ipKey,
        indicators: {
          requestCount: recentRequests,
          timeWindow: timeWindow,
          requestsPerMinute: recentRequests / 5,
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'high_request_volume',
        },
        attackVector: 'network',
        estimatedImpact: 'Potential service disruption',
      });
    }
  }

  /**
   * Detect SQL injection attempts
   */
  private async detectSqlInjectionAttempts(event: SecurityEventDocument): Promise<void> {
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /('.*OR.*'.*')/i,
      /(\bOR\b.*1.*=.*1)/i,
      /(';.*--)/i,
      /(\bEXEC\b.*\()/i,
    ];

    const payload = JSON.stringify(event.details);
    const endpoint = event.endpoint || '';
    const userAgent = event.userAgent || '';

    let suspiciousPatterns = 0;
    const matchedPatterns: string[] = [];

    sqlPatterns.forEach(pattern => {
      if (pattern.test(payload) || pattern.test(endpoint) || pattern.test(userAgent)) {
        suspiciousPatterns++;
        matchedPatterns.push(pattern.toString());
      }
    });

    if (suspiciousPatterns >= 2) {
      await this.createThreat({
        type: 'sql_injection',
        severity: suspiciousPatterns >= 4 ? 'critical' : 'high',
        source: 'threat_detection',
        sourceIp: event.ipAddress,
        targetUserId: event.userId?.toString(),
        targetResource: event.endpoint,
        indicators: {
          patternCount: suspiciousPatterns,
          matchedPatterns,
          payload: payload.substring(0, 500), // Truncate for storage
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'sql_injection_patterns',
        },
        attackVector: 'application',
        estimatedImpact: 'Potential database compromise',
      });
    }
  }

  /**
   * Detect XSS attempts
   */
  private async detectXssAttempts(event: SecurityEventDocument): Promise<void> {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /<link[^>]*>/i,
      /<meta[^>]*>/i,
      /eval\s*\(/i,
      /document\.(write|cookie|location)/i,
      /window\.(location|open)/i,
    ];

    const payload = JSON.stringify(event.details);
    let suspiciousPatterns = 0;
    const matchedPatterns: string[] = [];

    xssPatterns.forEach(pattern => {
      if (pattern.test(payload)) {
        suspiciousPatterns++;
        matchedPatterns.push(pattern.toString());
      }
    });

    if (suspiciousPatterns >= 1) {
      await this.createThreat({
        type: 'xss',
        severity: suspiciousPatterns >= 3 ? 'high' : 'medium',
        source: 'threat_detection',
        sourceIp: event.ipAddress,
        targetUserId: event.userId?.toString(),
        targetResource: event.endpoint,
        indicators: {
          patternCount: suspiciousPatterns,
          matchedPatterns,
          payload: payload.substring(0, 500),
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'xss_patterns',
        },
        attackVector: 'application',
        estimatedImpact: 'Potential client-side code execution',
      });
    }
  }

  /**
   * Detect anomalous user behavior
   */
  private async detectAnomalousUserBehavior(event: SecurityEventDocument): Promise<void> {
    if (!event.userId) return;

    const userId = event.userId.toString();
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours

    // Check for suspicious patterns
    const recentEvents = await this.securityEventModel.find({
      userId: event.userId,
      detectedAt: { $gte: new Date(Date.now() - timeWindow) },
    }).sort({ detectedAt: -1 }).limit(100);

    const uniqueIps = new Set(recentEvents.map(e => e.ipAddress));
    const uniqueUserAgents = new Set(recentEvents.map(e => e.userAgent));
    const failedAttempts = recentEvents.filter(e => e.type.includes('failed') || e.type.includes('error'));

    // Multiple IPs in short time
    if (uniqueIps.size >= 5) {
      await this.createThreat({
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'threat_detection',
        targetUserId: userId,
        sourceIp: event.ipAddress,
        indicators: {
          uniqueIps: uniqueIps.size,
          timeWindow: timeWindow,
          ips: Array.from(uniqueIps),
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'multiple_ips',
        },
        attackVector: 'user_behavior',
        estimatedImpact: 'Potential account compromise',
      });
    }

    // High failure rate
    const failureRate = failedAttempts.length / recentEvents.length;
    if (failureRate >= 0.3 && failedAttempts.length >= 10) {
      await this.createThreat({
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'threat_detection',
        targetUserId: userId,
        sourceIp: event.ipAddress,
        indicators: {
          failureRate,
          failedAttempts: failedAttempts.length,
          totalEvents: recentEvents.length,
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'high_failure_rate',
        },
        attackVector: 'user_behavior',
        estimatedImpact: 'Potential automated attack or account compromise',
      });
    }
  }

  /**
   * Detect rate limit violations
   */
  private async detectRateLimitViolations(event: SecurityEventDocument): Promise<void> {
    if (event.type !== 'rate_limit_exceeded') {
      return;
    }

    const ipKey = event.ipAddress;
    const violations = this.suspiciousPatterns.get(ipKey) || 0;
    this.suspiciousPatterns.set(ipKey, violations + 1);

    if (violations >= 5) {
      await this.createThreat({
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'threat_detection',
        sourceIp: ipKey,
        indicators: {
          violations: violations + 1,
          pattern: 'repeated_rate_limit_violations',
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'rate_limit_abuse',
        },
        attackVector: 'application',
        estimatedImpact: 'Potential API abuse or reconnaissance',
      });
    }
  }

  /**
   * Detect suspicious geolocation patterns
   */
  private async detectSuspiciousGeolocation(event: SecurityEventDocument): Promise<void> {
    if (!event.userId || !event.details?.geolocation) return;

    const userId = event.userId.toString();
    const currentLocation = event.details.geolocation;
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours

    // Get recent events with geolocation
    const recentEvents = await this.securityEventModel.find({
      userId: event.userId,
      detectedAt: { $gte: new Date(Date.now() - timeWindow) },
      'details.geolocation': { $exists: true },
    }).sort({ detectedAt: -1 }).limit(10);

    for (const recentEvent of recentEvents) {
      const recentLocation = recentEvent.details?.geolocation;
      if (!recentLocation) continue;

      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        recentLocation.latitude,
        recentLocation.longitude
      );

      const timeDiff = event.detectedAt.getTime() - recentEvent.detectedAt.getTime();
      const maxSpeed = 1000; // km/h (unrealistic for human travel)
      const requiredSpeed = (distance / (timeDiff / 3600000)); // km/h

      if (requiredSpeed > maxSpeed) {
        await this.createThreat({
          type: 'suspicious_activity',
          severity: 'high',
          source: 'threat_detection',
          targetUserId: userId,
          sourceIp: event.ipAddress,
          indicators: {
            distance,
            timeDiff,
            requiredSpeed,
            currentLocation,
            previousLocation: recentLocation,
          },
          evidence: {
            eventId: event._id,
            detectionTime: new Date(),
            pattern: 'impossible_travel',
          },
          attackVector: 'geolocation',
          estimatedImpact: 'Potential account compromise - impossible travel detected',
        });
        break;
      }
    }
  }

  /**
   * Detect account takeover attempts
   */
  private async detectAccountTakeover(event: SecurityEventDocument): Promise<void> {
    if (!event.userId) return;

    const accountTakeoverSignals = [
      'password_change',
      'email_change',
      'phone_change',
      '2fa_disabled',
      'recovery_email_used',
      'suspicious_login',
    ];

    if (!accountTakeoverSignals.includes(event.type)) return;

    const userId = event.userId.toString();
    const timeWindow = 30 * 60 * 1000; // 30 minutes

    // Count suspicious activities in short time window
    const suspiciousEvents = await this.securityEventModel.countDocuments({
      userId: event.userId,
      type: { $in: accountTakeoverSignals },
      detectedAt: { $gte: new Date(Date.now() - timeWindow) },
    });

    if (suspiciousEvents >= 3) {
      await this.createThreat({
        type: 'unauthorized_access',
        severity: 'critical',
        source: 'threat_detection',
        targetUserId: userId,
        sourceIp: event.ipAddress,
        indicators: {
          suspiciousEvents,
          timeWindow,
          signals: accountTakeoverSignals,
        },
        evidence: {
          eventId: event._id,
          detectionTime: new Date(),
          pattern: 'account_takeover_signals',
        },
        attackVector: 'account_takeover',
        estimatedImpact: 'Potential account compromise - multiple security changes detected',
      });
    }
  }

  /**
   * Create a security threat
   */
  private async createThreat(threatData: any): Promise<SecurityThreatDocument> {
    const threatKey = `${threatData.type}-${threatData.sourceIp}-${threatData.targetUserId || 'unknown'}`;
    
    // Avoid duplicate threats for the same pattern
    if (this.activeThreats.has(threatKey)) {
      return null;
    }

    this.activeThreats.add(threatKey);
    
    // Remove from active threats after 1 hour
    setTimeout(() => {
      this.activeThreats.delete(threatKey);
    }, 60 * 60 * 1000);

    const threat = new this.securityThreatModel({
      ...threatData,
      status: 'detected',
      firstDetected: new Date(),
      lastActivity: new Date(),
      mitigationActions: [],
      notes: [],
      relatedThreats: [],
      tags: [],
    });

    const savedThreat = await threat.save();

    this.logger.warn(`Security threat detected: ${threatData.type}`, {
      threatId: savedThreat._id,
      severity: threatData.severity,
      sourceIp: threatData.sourceIp,
      indicators: threatData.indicators,
    });

    return savedThreat;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * Math.cos(this.degreesToRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clean up old tracking data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    // Clean IP attempts
    for (const [ip, data] of this.ipAttempts.entries()) {
      if (now - data.firstAttempt > maxAge) {
        this.ipAttempts.delete(ip);
      }
    }

    // Clean user attempts
    for (const [user, data] of this.userAttempts.entries()) {
      if (now - data.firstAttempt > maxAge) {
        this.userAttempts.delete(user);
      }
    }

    // Clean suspicious patterns
    this.suspiciousPatterns.clear();

    this.logger.debug('Cleaned up old threat detection data');
  }

  /**
   * Get current threat detection statistics
   */
  getDetectionStats(): {
    trackedIps: number;
    trackedUsers: number;
    activeThreats: number;
    suspiciousPatterns: number;
  } {
    return {
      trackedIps: this.ipAttempts.size,
      trackedUsers: this.userAttempts.size,
      activeThreats: this.activeThreats.size,
      suspiciousPatterns: this.suspiciousPatterns.size,
    };
  }

  /**
   * Helper methods for request analysis
   */
  private detectSqlInjectionPattern(content: string): boolean {
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p\w+/i,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(content));
  }

  private detectXssPattern(content: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<form/gi,
    ];
    
    return xssPatterns.some(pattern => pattern.test(content));
  }

  private checkRateLimitViolation(ip: string, method: string): boolean {
    const key = `${ip}_${method}`;
    const now = Date.now();
    const window = 60000; // 1 minute
    const maxRequests = 100;

    if (!this.ipAttempts.has(key)) {
      this.ipAttempts.set(key, { count: 1, firstAttempt: now, methods: new Set([method]) });
      return false;
    }

    const attempts = this.ipAttempts.get(key)!;
    
    if (now - attempts.firstAttempt > window) {
      // Reset window
      attempts.count = 1;
      attempts.firstAttempt = now;
      return false;
    }

    attempts.count++;
    return attempts.count > maxRequests;
  }

  private detectSuspiciousUserAgent(userAgent?: string): boolean {
    if (!userAgent) return true; // No user agent is suspicious

    const suspiciousPatterns = [
      /bot/i,
      /crawl/i,
      /spider/i,
      /scanner/i,
      /hack/i,
      /exploit/i,
      /curl/i,
      /wget/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private detectPathTraversalPattern(url: string): boolean {
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.%2f/gi,
      /\.\.%5c/gi,
    ];

    return pathTraversalPatterns.some(pattern => pattern.test(url));
  }
}
