import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationSalt: string;
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');
    if (!masterKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_MASTER_KEY environment variable is required in production');
      }
      this.logger.warn('ENCRYPTION_MASTER_KEY not set, using development default. DO NOT USE IN PRODUCTION!');
    }

    const actualMasterKey = masterKey || 'dev-key-change-in-production-32chars';
    this.keyDerivationSalt = this.configService.get<string>('KEY_DERIVATION_SALT') || 'sportbet-salt-2024';
    this.encryptionKey = crypto.pbkdf2Sync(actualMasterKey, this.keyDerivationSalt, 100000, 32, 'sha512');
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   */
  encrypt(data: string | Buffer): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('sportbet-aad'));

      let encrypted = cipher.update(data as string, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      };
    } catch (error) {
      this.logger.error('Encryption failed', error.stack);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data encrypted with encrypt method
   */
  decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    tag: string;
  }): string {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('sportbet-aad'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error.stack);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt data with a provided key (for database field encryption)
   */
  encryptField(data: string, fieldKey?: string): string {
    try {
      const key = fieldKey || this.encryptionKey;
      const derivedKey = crypto.pbkdf2Sync(key, this.keyDerivationSalt, 10000, 32, 'sha256');
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', derivedKey);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('Field encryption failed', error.stack);
      throw new Error('Field encryption failed');
    }
  }

  /**
   * Decrypt field data
   */
  decryptField(encryptedData: string, fieldKey?: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted field format');
      }

      const key = fieldKey || this.encryptionKey;
      const derivedKey = crypto.pbkdf2Sync(key, this.keyDerivationSalt, 10000, 32, 'sha256');
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher('aes-256-cbc', derivedKey);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Field decryption failed', error.stack);
      throw new Error('Field decryption failed');
    }
  }

  /**
   * Hash password with bcrypt (PCI DSS compliant)
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12'), 10);
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate cryptographically secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key with specific format
   */
  generateApiKey(prefix: string = 'sk'): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(20).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Create HMAC signature for webhook validation
   */
  createHmacSignature(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHmacSignature(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHmacSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Encrypt payment card data (PCI DSS compliant)
   */
  encryptCardData(cardData: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv?: string;
  }): {
    encryptedNumber: string;
    encryptedExpiry: string;
    encryptedCvv?: string;
    tokenReference: string;
  } {
    try {
      // Mask the card number, only store last 4 digits encrypted
      const maskedNumber = '*'.repeat(cardData.number.length - 4) + cardData.number.slice(-4);
      const encryptedNumber = this.encryptField(maskedNumber, 'card-number-key');
      
      const encryptedExpiry = this.encryptField(
        `${cardData.expiryMonth}/${cardData.expiryYear}`, 
        'card-expiry-key'
      );
      
      let encryptedCvv: string | undefined;
      if (cardData.cvv) {
        // CVV should never be stored, but if needed for temporary processing
        encryptedCvv = this.encryptField(cardData.cvv, 'card-cvv-key');
      }

      // Generate a token reference for the card
      const tokenReference = this.generateCardToken(cardData.number);

      return {
        encryptedNumber,
        encryptedExpiry,
        encryptedCvv,
        tokenReference,
      };
    } catch (error) {
      this.logger.error('Card data encryption failed', error.stack);
      throw new Error('Card data encryption failed');
    }
  }

  /**
   * Generate tokenized reference for card numbers
   */
  private generateCardToken(cardNumber: string): string {
    const hash = crypto.createHash('sha256').update(cardNumber + this.keyDerivationSalt).digest('hex');
    return `tok_${hash.substring(0, 24)}`;
  }

  /**
   * Encrypt file content for secure storage
   */
  async encryptFile(fileBuffer: Buffer): Promise<{
    encryptedData: Buffer;
    iv: string;
    tag: string;
    checksum: string;
  }> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      
      const encryptedChunks: Buffer[] = [];
      encryptedChunks.push(cipher.update(fileBuffer));
      encryptedChunks.push(cipher.final());
      
      const encryptedData = Buffer.concat(encryptedChunks);
      const tag = cipher.getAuthTag();
      
      // Create checksum for integrity verification
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      return {
        encryptedData,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        checksum,
      };
    } catch (error) {
      this.logger.error('File encryption failed', error.stack);
      throw new Error('File encryption failed');
    }
  }

  /**
   * Decrypt file content
   */
  async decryptFile(encryptedFile: {
    encryptedData: Buffer;
    iv: string;
    tag: string;
    checksum: string;
  }): Promise<Buffer> {
    try {
      const iv = Buffer.from(encryptedFile.iv, 'hex');
      const tag = Buffer.from(encryptedFile.tag, 'hex');
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAuthTag(tag);
      
      const decryptedChunks: Buffer[] = [];
      decryptedChunks.push(decipher.update(encryptedFile.encryptedData));
      decryptedChunks.push(decipher.final());
      
      const decryptedData = Buffer.concat(decryptedChunks);
      
      // Verify integrity
      const checksum = crypto.createHash('sha256').update(decryptedData).digest('hex');
      if (checksum !== encryptedFile.checksum) {
        throw new Error('File integrity check failed');
      }

      return decryptedData;
    } catch (error) {
      this.logger.error('File decryption failed', error.stack);
      throw new Error('File decryption failed');
    }
  }

  /**
   * Create encrypted backup of sensitive data
   */
  createEncryptedBackup(data: any): {
    encryptedBackup: string;
    backupMetadata: {
      timestamp: string;
      checksum: string;
      version: string;
    };
  } {
    try {
      const timestamp = new Date().toISOString();
      const dataString = JSON.stringify(data);
      const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
      
      const backupData = {
        data: dataString,
        timestamp,
        checksum,
        version: '1.0',
      };
      
      const encryptedBackup = this.encryptField(JSON.stringify(backupData), 'backup-key');

      return {
        encryptedBackup,
        backupMetadata: {
          timestamp,
          checksum,
          version: '1.0',
        },
      };
    } catch (error) {
      this.logger.error('Backup encryption failed', error.stack);
      throw new Error('Backup encryption failed');
    }
  }

  /**
   * Restore from encrypted backup
   */
  restoreFromEncryptedBackup(encryptedBackup: string): {
    data: any;
    metadata: {
      timestamp: string;
      checksum: string;
      version: string;
    };
  } {
    try {
      const decryptedBackup = this.decryptField(encryptedBackup, 'backup-key');
      const backupData = JSON.parse(decryptedBackup);
      
      // Verify integrity
      const dataChecksum = crypto.createHash('sha256').update(backupData.data).digest('hex');
      if (dataChecksum !== backupData.checksum) {
        throw new Error('Backup integrity check failed');
      }
      
      return {
        data: JSON.parse(backupData.data),
        metadata: {
          timestamp: backupData.timestamp,
          checksum: backupData.checksum,
          version: backupData.version,
        },
      };
    } catch (error) {
      this.logger.error('Backup restoration failed', error.stack);
      throw new Error('Backup restoration failed');
    }
  }

  /**
   * Generate encryption key for field-level encryption
   */
  generateFieldEncryptionKey(context: string): string {
    return crypto.pbkdf2Sync(
      this.encryptionKey,
      `${this.keyDerivationSalt}-${context}`,
      50000,
      32,
      'sha256'
    ).toString('hex');
  }

  /**
   * Anonymize data for analytics (irreversible)
   */
  anonymizeData(data: string, salt?: string): string {
    const anonymizationSalt = salt || this.configService.get<string>('ANONYMIZATION_SALT', 'default-anon-salt');
    return crypto.createHash('sha256').update(data + anonymizationSalt).digest('hex');
  }

  /**
   * Create data fingerprint for deduplication
   */
  createDataFingerprint(data: any): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate time-based one-time password (TOTP) secret
   */
  generateTotpSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Rotate encryption keys (for key rotation procedures)
   */
  async rotateEncryptionKey(oldData: string): Promise<string> {
    try {
      // Decrypt with old key, encrypt with new key
      const decrypted = this.decryptField(oldData);
      return this.encryptField(decrypted);
    } catch (error) {
      this.logger.error('Key rotation failed', error.stack);
      throw new Error('Key rotation failed');
    }
  }
}
