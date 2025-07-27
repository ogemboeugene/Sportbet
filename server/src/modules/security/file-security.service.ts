import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import { EncryptionService } from './encryption.service';
import { VirusScanningService } from './virus-scanning.service';

@Injectable()
export class FileSecurityService {
  private readonly logger = new Logger(FileSecurityService.name);
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];
  private readonly virusScanEnabled: boolean;
  private readonly quarantinePath: string;

  constructor(
    private configService: ConfigService,
    private encryptionService: EncryptionService,
    private virusScanningService: VirusScanningService,
  ) {
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
    this.allowedMimeTypes = this.configService.get<string>('ALLOWED_MIME_TYPES', 
      'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain'
    ).split(',');
    this.virusScanEnabled = this.configService.get<boolean>('VIRUS_SCAN_ENABLED', true);
    this.quarantinePath = this.configService.get<string>('QUARANTINE_PATH', '/tmp/quarantine');
  }

  /**
   * Validate uploaded file for security threats
   */
  async validateFile(file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    metadata: {
      originalName: string;
      sanitizedName: string;
      mimeType: string;
      size: number;
      hash: string;
      scanResults?: any;
    };
  }> {
    const errors: string[] = [];
    
    try {
      // File size validation
      if (file.size > this.maxFileSize) {
        errors.push(`File size exceeds maximum limit of ${this.maxFileSize} bytes`);
      }

      // Empty file check
      if (file.size === 0) {
        errors.push('File is empty');
      }

      // Filename validation
      const sanitizedName = this.sanitizeFileName(file.originalname);
      if (!sanitizedName) {
        errors.push('Invalid filename');
      }

      // MIME type validation
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`File type ${file.mimetype} is not allowed`);
      }

      // File signature validation (magic bytes)
      const signatureValid = await this.validateFileSignature(file.buffer, file.mimetype);
      if (!signatureValid) {
        errors.push('File signature does not match declared MIME type');
      }

      // Content validation
      const contentSafe = await this.validateFileContent(file.buffer, file.mimetype);
      if (!contentSafe) {
        errors.push('File content contains potentially dangerous elements');
      }

      // Virus scanning
      let scanResults = null;
      if (this.virusScanEnabled) {
        scanResults = await this.scanForViruses(file.buffer, sanitizedName);
        if (scanResults.infected) {
          errors.push('File contains malware');
        }
      }

      // Generate file hash for integrity
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      const metadata = {
        originalName: file.originalname,
        sanitizedName: sanitizedName || 'unknown',
        mimeType: file.mimetype,
        size: file.size,
        hash,
        scanResults,
      };

      return {
        isValid: errors.length === 0,
        errors,
        metadata,
      };
    } catch (error) {
      this.logger.error('File validation failed', error.stack);
      return {
        isValid: false,
        errors: ['File validation failed'],
        metadata: {
          originalName: file.originalname,
          sanitizedName: '',
          mimeType: file.mimetype,
          size: file.size,
          hash: '',
        },
      };
    }
  }

  /**
   * Sanitize filename to prevent path traversal and other attacks
   */
  private sanitizeFileName(filename: string): string | null {
    if (!filename || typeof filename !== 'string') {
      return null;
    }

    // Remove path information
    let sanitized = path.basename(filename);

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');
    sanitized = sanitized.replace(/\.\./g, '');
    sanitized = sanitized.replace(/^\./, '');
    sanitized = sanitized.trim();

    // Check length
    if (sanitized.length === 0 || sanitized.length > 255) {
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
   * Validate file signature (magic bytes) against declared MIME type
   */
  private async validateFileSignature(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
    if (buffer.length < 4) {
      return false;
    }

    const signatures = {
      'image/jpeg': [
        [0xFF, 0xD8, 0xFF, 0xE0],
        [0xFF, 0xD8, 0xFF, 0xE1],
        [0xFF, 0xD8, 0xFF, 0xE2],
        [0xFF, 0xD8, 0xFF, 0xE3],
        [0xFF, 0xD8, 0xFF, 0xE8],
      ],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [
        [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
        [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
      ],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP uses RIFF container)
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'text/plain': [], // Text files don't have a specific signature
    };

    const expectedSignatures = signatures[declaredMimeType];
    if (!expectedSignatures || expectedSignatures.length === 0) {
      // For text files or unknown types, we can't validate signature
      return declaredMimeType === 'text/plain';
    }

    return expectedSignatures.some(signature => {
      if (buffer.length < signature.length) {
        return false;
      }
      
      return signature.every((byte, index) => buffer[index] === byte);
    });
  }

  /**
   * Validate file content for potentially dangerous elements
   */
  private async validateFileContent(buffer: Buffer, mimeType: string): Promise<boolean> {
    try {
      const content = buffer.toString('utf8');

      // Check for embedded scripts in image metadata (EXIF, etc.)
      if (mimeType.startsWith('image/')) {
        return this.validateImageContent(buffer);
      }

      // Check for dangerous content in text files
      if (mimeType === 'text/plain') {
        return this.validateTextContent(content);
      }

      // Check for dangerous content in PDF files
      if (mimeType === 'application/pdf') {
        return this.validatePdfContent(buffer);
      }

      return true;
    } catch (error) {
      this.logger.warn('Content validation failed', error.message);
      return false;
    }
  }

  /**
   * Validate image content for embedded threats
   */
  private validateImageContent(buffer: Buffer): boolean {
    const content = buffer.toString('ascii');
    
    // Check for common script injections in image metadata
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\s*\(/i,
      /document\./i,
      /window\./i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate text content for potentially dangerous elements
   */
  private validateTextContent(content: string): boolean {
    // Check for potentially dangerous content in text files
    const dangerousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate PDF content for potentially dangerous elements
   */
  private validatePdfContent(buffer: Buffer): boolean {
    const content = buffer.toString('ascii');
    
    // Check for dangerous JavaScript or actions in PDF
    const dangerousPatterns = [
      /\/JavaScript\s*\(/i,
      /\/JS\s*\(/i,
      /\/Action\s*<</i,
      /\/Launch\s*<</i,
      /\/URI\s*\(/i,
      /this\.print\s*\(/i,
      /app\.alert\s*\(/i,
      /app\.beep\s*\(/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Scan file for viruses using the comprehensive virus scanning service
   */
  private async scanForViruses(buffer: Buffer, filename: string): Promise<{
    infected: boolean;
    threats: string[];
    scanTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const scanResult = await this.virusScanningService.scanFile(buffer, filename);
      
      if (!scanResult.isClean && scanResult.threats.length > 0) {
        // Quarantine the infected file
        await this.virusScanningService.quarantineFile(buffer, filename, scanResult.threats);
        
        this.logger.warn(`Infected file detected: ${filename}, threats: ${scanResult.threats.join(', ')}`);
      }

      return {
        infected: !scanResult.isClean,
        threats: scanResult.threats,
        scanTime: scanResult.scanDuration,
      };
    } catch (error) {
      this.logger.error(`Virus scan failed for ${filename}: ${error.message}`, error.stack);
      
      // In case of scan failure, err on the side of caution
      return {
        infected: true,
        threats: ['scan_error'],
        scanTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Detect suspicious patterns using heuristic analysis
   */
  private detectSuspiciousPatterns(buffer: Buffer): boolean {
    // Check for high entropy (might indicate encrypted/packed malware)
    const entropy = this.calculateEntropy(buffer);
    if (entropy > 7.5) {
      return true;
    }

    // Check for suspicious string patterns
    const content = buffer.toString('ascii');
    const suspiciousPatterns = [
      /CreateRemoteThread/i,
      /VirtualAlloc/i,
      /WriteProcessMemory/i,
      /SetWindowsHookEx/i,
      /GetProcAddress/i,
      /LoadLibrary/i,
      /RegCreateKey/i,
      /InternetConnect/i,
      /WinExec/i,
      /ShellExecute/i,
    ];

    const patternMatches = suspiciousPatterns.filter(pattern => pattern.test(content));
    return patternMatches.length >= 3; // Multiple suspicious API calls
  }

  /**
   * Calculate entropy of data (used for detecting packed/encrypted content)
   */
  private calculateEntropy(buffer: Buffer): number {
    const frequency = new Array(256).fill(0);
    
    for (let i = 0; i < buffer.length; i++) {
      frequency[buffer[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const probability = frequency[i] / buffer.length;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Quarantine infected files
   */
  private async quarantineFile(buffer: Buffer, filename: string, threats: string[]): Promise<void> {
    try {
      const quarantineId = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const quarantineInfo = {
        id: quarantineId,
        originalFilename: filename,
        quarantineTime: timestamp,
        threats,
        fileHash: crypto.createHash('sha256').update(buffer).digest('hex'),
        fileSize: buffer.length,
      };

      // In a real implementation, this would:
      // 1. Move file to quarantine directory
      // 2. Encrypt the quarantined file
      // 3. Log the quarantine action
      // 4. Notify security team
      // 5. Update threat database

      this.logger.error(`File quarantined: ${filename}`, quarantineInfo);
    } catch (error) {
      this.logger.error('Failed to quarantine file', error.stack);
    }
  }

  /**
   * Encrypt uploaded file for secure storage
   */
  async encryptUploadedFile(fileData: {
    buffer: Buffer;
    metadata: any;
  }): Promise<{
    encryptedData: Buffer;
    encryptionMetadata: {
      iv: string;
      tag: string;
      checksum: string;
      algorithm: string;
    };
  }> {
    try {
      const encryptionResult = await this.encryptionService.encryptFile(fileData.buffer);
      
      return {
        encryptedData: encryptionResult.encryptedData,
        encryptionMetadata: {
          iv: encryptionResult.iv,
          tag: encryptionResult.tag,
          checksum: encryptionResult.checksum,
          algorithm: 'aes-256-gcm',
        },
      };
    } catch (error) {
      this.logger.error('File encryption failed', error.stack);
      throw new BadRequestException('File encryption failed');
    }
  }

  /**
   * Decrypt stored file
   */
  async decryptStoredFile(encryptedFile: {
    encryptedData: Buffer;
    encryptionMetadata: {
      iv: string;
      tag: string;
      checksum: string;
      algorithm: string;
    };
  }): Promise<Buffer> {
    try {
      return await this.encryptionService.decryptFile({
        encryptedData: encryptedFile.encryptedData,
        iv: encryptedFile.encryptionMetadata.iv,
        tag: encryptedFile.encryptionMetadata.tag,
        checksum: encryptedFile.encryptionMetadata.checksum,
      });
    } catch (error) {
      this.logger.error('File decryption failed', error.stack);
      throw new Error('File decryption failed');
    }
  }

  /**
   * Generate secure file access token
   */
  generateFileAccessToken(fileId: string, userId: string, expiryMinutes: number = 60): string {
    const payload = {
      fileId,
      userId,
      exp: Math.floor(Date.now() / 1000) + (expiryMinutes * 60),
      iat: Math.floor(Date.now() / 1000),
    };

    return this.encryptionService.encryptField(JSON.stringify(payload), 'file-access-key');
  }

  /**
   * Validate file access token
   */
  validateFileAccessToken(token: string): {
    isValid: boolean;
    fileId?: string;
    userId?: string;
  } {
    try {
      const decrypted = this.encryptionService.decryptField(token, 'file-access-key');
      const payload = JSON.parse(decrypted);
      
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return { isValid: false };
      }

      return {
        isValid: true,
        fileId: payload.fileId,
        userId: payload.userId,
      };
    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Get file security metrics
   */
  getSecurityMetrics(): {
    maxFileSize: number;
    allowedMimeTypes: string[];
    virusScanEnabled: boolean;
    totalScannedFiles: number;
    detectedThreats: number;
    quarantinedFiles: number;
  } {
    // In a real implementation, these would be tracked in a database
    return {
      maxFileSize: this.maxFileSize,
      allowedMimeTypes: this.allowedMimeTypes,
      virusScanEnabled: this.virusScanEnabled,
      totalScannedFiles: 0, // Would be tracked
      detectedThreats: 0,    // Would be tracked
      quarantinedFiles: 0,   // Would be tracked
    };
  }
}
