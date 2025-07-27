import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    })
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${this.configService.get('CLIENT_URL')}/reset-password?token=${resetToken}`
    
    const mailOptions = {
      from: this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Reset Your BetPlatform Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          <p>You requested to reset your password for your BetPlatform account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
          <p style="color: #ef4444; font-weight: bold;">This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent by BetPlatform. If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    }

    await this.transporter.sendMail(mailOptions)
  }

  async sendEmailVerification(email: string, verificationToken: string) {
    const verificationUrl = `${this.configService.get('CLIENT_URL')}/verify-email?token=${verificationToken}`
    
    const mailOptions = {
      from: this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Verify Your BetPlatform Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to BetPlatform!</h2>
          <p>Thank you for creating your account. Please verify your email address to get started.</p>
          <p>Click the button below to verify your email:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Verify Email</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
          <p style="color: #ef4444; font-weight: bold;">This link will expire in 24 hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent by BetPlatform. If you have any questions, please contact our support team.
          </p>
        </div>
      `,
    }

    await this.transporter.sendMail(mailOptions)
  }

  async sendSecurityAlert(email: string, alertType: string, details: any) {
    const mailOptions = {
      from: this.configService.get('SMTP_USER'),
      to: email,
      subject: 'BetPlatform Security Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Security Alert</h2>
          <p>We detected ${alertType} on your BetPlatform account.</p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">Alert Details:</h3>
            <ul style="color: #7f1d1d;">
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>IP Address:</strong> ${details.ipAddress || 'Unknown'}</li>
              <li><strong>User Agent:</strong> ${details.userAgent || 'Unknown'}</li>
              <li><strong>Location:</strong> ${details.location || 'Unknown'}</li>
            </ul>
          </div>
          <p>If this was you, you can ignore this email. If you don't recognize this activity, please:</p>
          <ol>
            <li>Change your password immediately</li>
            <li>Enable two-factor authentication</li>
            <li>Contact our support team</li>
          </ol>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent by BetPlatform Security Team. If you have any questions, please contact our support team immediately.
          </p>
        </div>
      `,
    }

    await this.transporter.sendMail(mailOptions)
  }
}