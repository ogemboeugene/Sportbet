import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class VirusScanningService {
  private readonly logger = new Logger(VirusScanningService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Scan file for viruses and malware
   */
  async scanFile(fileBuffer: Buffer, fileName: string): Promise<{
    isClean: boolean;
    threats: string[];
    scanDuration: number;
    scanId: string;
  }> {
    const startTime = Date.now();
    const scanId = this.generateScanId();

    try {
      this.logger.log(`Starting virus scan for file: ${fileName} (${scanId})`);

      const scanResult = await this.performVirusScan(fileBuffer, fileName);
      const scanDuration = Date.now() - startTime;

      this.logger.log(`Virus scan completed for ${fileName}: ${scanResult.isClean ? 'CLEAN' : 'THREATS DETECTED'} (${scanDuration}ms)`);

      return {
        ...scanResult,
        scanDuration,
        scanId,
      };
    } catch (error) {
      this.logger.error(`Virus scan failed for file ${fileName}: ${error.message}`, error.stack);
      
      // In case of scan failure, err on the side of caution
      return {
        isClean: false,
        threats: ['scan_error'],
        scanDuration: Date.now() - startTime,
        scanId,
      };
    }
  }

  /**
   * Perform the actual virus scanning
   */
  private async performVirusScan(fileBuffer: Buffer, fileName: string): Promise<{
    isClean: boolean;
    threats: string[];
  }> {
    const threats: string[] = [];

    // 1. File signature analysis
    const signatureThreats = this.analyzeFileSignatures(fileBuffer, fileName);
    threats.push(...signatureThreats);

    // 2. Pattern-based detection
    const patternThreats = this.detectMaliciousPatterns(fileBuffer);
    threats.push(...patternThreats);

    // 3. Entropy analysis for packed/encrypted files
    const entropyThreats = this.analyzeEntropy(fileBuffer);
    threats.push(...entropyThreats);

    // 4. Header analysis
    const headerThreats = this.analyzeFileHeaders(fileBuffer, fileName);
    threats.push(...headerThreats);

    // 5. Size and structure validation
    const structureThreats = this.validateFileStructure(fileBuffer, fileName);
    threats.push(...structureThreats);

    return {
      isClean: threats.length === 0,
      threats,
    };
  }

  /**
   * Analyze file signatures for known malware patterns
   */
  private analyzeFileSignatures(fileBuffer: Buffer, fileName: string): string[] {
    const threats: string[] = [];
    const fileHex = fileBuffer.slice(0, 1024).toString('hex').toLowerCase();

    // Known malicious signatures (simplified for example)
    const maliciousSignatures = [
      // PE executable markers that might be suspicious in file uploads
      { pattern: '4d5a', name: 'executable_file', description: 'Executable file detected' },
      // Script patterns
      { pattern: '3c7363726970743e', name: 'embedded_script', description: 'Embedded script detected' },
      // PHP backdoor patterns
      { pattern: '3c3f706870', name: 'php_script', description: 'PHP script detected' },
      // Archive bombs (highly compressed data)
      { pattern: '504b0304', name: 'zip_file', description: 'ZIP file detected' },
    ];

    for (const signature of maliciousSignatures) {
      if (fileHex.includes(signature.pattern)) {
        // Additional validation for false positives
        if (this.validateSignatureContext(fileBuffer, signature, fileName)) {
          threats.push(signature.name);
          this.logger.warn(`Malicious signature detected: ${signature.description} in ${fileName}`);
        }
      }
    }

    return threats;
  }

  /**
   * Detect malicious patterns in file content
   */
  private detectMaliciousPatterns(fileBuffer: Buffer): string[] {
    const threats: string[] = [];
    const content = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 10000));

    // Malicious patterns
    const patterns = [
      { regex: /eval\s*\(/gi, threat: 'eval_usage' },
      { regex: /base64_decode\s*\(/gi, threat: 'base64_decode' },
      { regex: /shell_exec\s*\(/gi, threat: 'shell_execution' },
      { regex: /system\s*\(/gi, threat: 'system_call' },
      { regex: /exec\s*\(/gi, threat: 'exec_call' },
      { regex: /passthru\s*\(/gi, threat: 'passthru_call' },
      { regex: /\$_GET\[.*\]\s*\(/gi, threat: 'dynamic_execution' },
      { regex: /\$_POST\[.*\]\s*\(/gi, threat: 'dynamic_execution' },
      { regex: /file_get_contents\s*\(\s*["']php:\/\/input["']/gi, threat: 'php_input_stream' },
      { regex: /preg_replace\s*\(.*\/e/gi, threat: 'preg_replace_eval' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(content)) {
        threats.push(pattern.threat);
        this.logger.warn(`Malicious pattern detected: ${pattern.threat}`);
      }
    }

    return threats;
  }

  /**
   * Analyze file entropy to detect packed/encrypted files
   */
  private analyzeEntropy(fileBuffer: Buffer): string[] {
    const threats: string[] = [];
    const entropy = this.calculateEntropy(fileBuffer);

    // High entropy might indicate compressed/encrypted/packed content
    if (entropy > 7.5) {
      threats.push('high_entropy');
      this.logger.warn(`High entropy detected: ${entropy}`);
    }

    return threats;
  }

  /**
   * Calculate Shannon entropy of file content
   */
  private calculateEntropy(buffer: Buffer): number {
    const freqMap = new Map<number, number>();
    const totalBytes = buffer.length;

    // Count byte frequencies
    for (let i = 0; i < totalBytes; i++) {
      const byte = buffer[i];
      freqMap.set(byte, (freqMap.get(byte) || 0) + 1);
    }

    // Calculate entropy
    let entropy = 0;
    for (const freq of freqMap.values()) {
      const probability = freq / totalBytes;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Analyze file headers for inconsistencies
   */
  private analyzeFileHeaders(fileBuffer: Buffer, fileName: string): string[] {
    const threats: string[] = [];
    const extension = path.extname(fileName).toLowerCase();
    const header = fileBuffer.slice(0, 16);

    // File type validation based on magic numbers
    const magicNumbers = {
      '.jpg': [0xff, 0xd8, 0xff],
      '.jpeg': [0xff, 0xd8, 0xff],
      '.png': [0x89, 0x50, 0x4e, 0x47],
      '.gif': [0x47, 0x49, 0x46, 0x38],
      '.pdf': [0x25, 0x50, 0x44, 0x46],
      '.zip': [0x50, 0x4b, 0x03, 0x04],
    };

    if (magicNumbers[extension]) {
      const expectedHeader = magicNumbers[extension];
      const actualHeader = Array.from(header.slice(0, expectedHeader.length));
      
      if (!this.arraysEqual(expectedHeader, actualHeader)) {
        threats.push('header_mismatch');
        this.logger.warn(`File header mismatch for ${fileName}: expected ${extension} but got different signature`);
      }
    }

    return threats;
  }

  /**
   * Validate file structure integrity
   */
  private validateFileStructure(fileBuffer: Buffer, fileName: string): string[] {
    const threats: string[] = [];
    const extension = path.extname(fileName).toLowerCase();
    const fileSize = fileBuffer.length;

    // Size validation
    if (fileSize === 0) {
      threats.push('empty_file');
    }

    if (fileSize > 100 * 1024 * 1024) { // 100MB
      threats.push('oversized_file');
    }

    // Extension-specific validation
    switch (extension) {
      case '.txt':
        if (this.containsBinaryData(fileBuffer)) {
          threats.push('binary_in_text');
        }
        break;
      
      case '.jpg':
      case '.jpeg':
        if (!this.validateJpegStructure(fileBuffer)) {
          threats.push('invalid_jpeg');
        }
        break;
      
      case '.png':
        if (!this.validatePngStructure(fileBuffer)) {
          threats.push('invalid_png');
        }
        break;
    }

    return threats;
  }

  /**
   * Validate signature context to reduce false positives
   */
  private validateSignatureContext(fileBuffer: Buffer, signature: any, fileName: string): boolean {
    const extension = path.extname(fileName).toLowerCase();
    
    // Allow certain signatures in specific contexts
    if (signature.name === 'zip_file' && ['.zip', '.docx', '.xlsx', '.pptx'].includes(extension)) {
      return false; // Not a threat in these contexts
    }
    
    if (signature.name === 'php_script' && extension === '.php') {
      return false; // Expected for PHP files
    }

    return true;
  }

  /**
   * Check if file contains binary data (for text file validation)
   */
  private containsBinaryData(buffer: Buffer): boolean {
    const sample = buffer.slice(0, 1024);
    
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Check for non-printable characters (excluding common whitespace)
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Basic JPEG structure validation
   */
  private validateJpegStructure(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    
    // Check for JPEG SOI marker
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return false;
    
    // Check for JPEG EOI marker at the end
    const end = buffer.length - 2;
    if (buffer[end] !== 0xff || buffer[end + 1] !== 0xd9) return false;
    
    return true;
  }

  /**
   * Basic PNG structure validation
   */
  private validatePngStructure(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;
    
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== pngSignature[i]) return false;
    }
    
    return true;
  }

  /**
   * Compare arrays for equality
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(): string {
    return `scan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Quarantine file (move to quarantine directory)
   */
  async quarantineFile(fileBuffer: Buffer, fileName: string, threats: string[]): Promise<{
    quarantined: boolean;
    quarantinePath?: string;
    error?: string;
  }> {
    try {
      const quarantineDir = this.configService.get('QUARANTINE_DIR', '/tmp/quarantine');
      const quarantineFileName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}_${fileName}`;
      const quarantinePath = path.join(quarantineDir, quarantineFileName);

      // In a real implementation, you would write to the quarantine directory
      // For now, we'll just log the action
      this.logger.warn(`File quarantined: ${fileName} -> ${quarantinePath} (threats: ${threats.join(', ')})`);

      return {
        quarantined: true,
        quarantinePath,
      };
    } catch (error) {
      this.logger.error(`Failed to quarantine file ${fileName}: ${error.message}`, error.stack);
      
      return {
        quarantined: false,
        error: error.message,
      };
    }
  }

  /**
   * Get scan statistics
   */
  getStatistics(): {
    scansPerformed: number;
    threatsDetected: number;
    cleanFiles: number;
    averageScanTime: number;
  } {
    // In a real implementation, you would track these statistics
    return {
      scansPerformed: 0,
      threatsDetected: 0,
      cleanFiles: 0,
      averageScanTime: 0,
    };
  }
}
