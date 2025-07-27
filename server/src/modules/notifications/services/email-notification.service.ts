import { Injectable, Logger } from '@nestjs/common'
import * as nodemailer from 'nodemailer'
import * as handlebars from 'handlebars'
import * as fs from 'fs'
import * as path from 'path'
import { NotificationDocument } from '../../../database/schemas/notification.schema'
import { NotificationAnalyticsService } from './notification-analytics.service'
import { NotificationTemplateService } from './notification-template.service'
import { NotificationQueueService } from './notification-queue.service'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface EmailJob {
  to: string
  subject: string
  html: string
  text: string
  notificationId: string
  userId: string
  type: string
  metadata?: Record<string, any>
  retryCount?: number
  maxRetries?: number
}

interface UnsubscribeToken {
  userId: string
  email: string
  timestamp: number
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name)
  private transporter: nodemailer.Transporter
  private templates: Map<string, handlebars.TemplateDelegate> = new Map()
  private readonly maxRetries = 3
  private readonly retryDelay = 5000 // 5 seconds
  private readonly emailQueue: EmailJob[] = []
  private isProcessingQueue = false

  constructor(
    private analyticsService: NotificationAnalyticsService,
    private templateService: NotificationTemplateService,
    private queueService: NotificationQueueService,
  ) {
    this.initializeTransporter()
    this.loadEmailTemplates()
    this.startQueueProcessor()
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 10,
    })
  }

  private async loadEmailTemplates(): Promise<void> {
    try {
      const templatesDir = path.join(__dirname, '../../../../templates/email')
      
      // Create templates directory if it doesn't exist
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true })
        await this.createDefaultTemplates(templatesDir)
      }

      const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.hbs'))
      
      for (const file of templateFiles) {
        const templateName = path.basename(file, '.hbs')
        const templatePath = path.join(templatesDir, file)
        const templateContent = fs.readFileSync(templatePath, 'utf8')
        
        this.templates.set(templateName, handlebars.compile(templateContent))
        this.logger.log(`Loaded email template: ${templateName}`)
      }

      // Register Handlebars helpers
      this.registerHandlebarsHelpers()
    } catch (error) {
      this.logger.error(`Failed to load email templates: ${error.message}`)
    }
  }

  private registerHandlebarsHelpers(): void {
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount)
    })

    handlebars.registerHelper('formatDate', (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date))
    })

    handlebars.registerHelper('eq', (a: any, b: any) => a === b)
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b)
    handlebars.registerHelper('gt', (a: number, b: number) => a > b)
    handlebars.registerHelper('lt', (a: number, b: number) => a < b)
  }

  async sendNotification(
    notification: NotificationDocument,
    recipientEmail: string,
    recipientName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Get template from database
      const template = await this.templateService.findByTypeAndChannel(
        notification.type,
        'email'
      )

      let emailContent: EmailTemplate
      
      if (template) {
        // Use database template
        const rendered = this.templateService.renderTemplate(template, {
          ...notification.metadata,
          recipientName,
          title: notification.title,
          message: notification.message,
        })
        
        emailContent = {
          subject: rendered.subject,
          html: rendered.htmlContent || this.generateDefaultHtml(rendered.content, notification, recipientName),
          text: rendered.content
        }
      } else {
        // Use file-based template or fallback
        emailContent = await this.renderEmailTemplate(notification.type, {
          ...notification.metadata,
          recipientName,
          title: notification.title,
          message: notification.message,
          notification
        })
      }

      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'Betting Platform',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        },
        to: recipientEmail,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        headers: {
          'X-Notification-ID': notification._id.toString(),
          'X-Notification-Type': notification.type,
          'List-Unsubscribe': `<${this.generateUnsubscribeUrl(notification.userId.toString(), recipientEmail)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }

      const result = await this.transporter.sendMail(mailOptions)

      // Track successful send
      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'sent',
        {
          messageId: result.messageId,
          recipientEmail,
        }
      )

      this.logger.log(`Email sent successfully: ${result.messageId}`)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`)

      // Track failure
      await this.analyticsService.trackEvent(
        notification._id as any,
        notification.userId as any,
        notification.type,
        notification.channel,
        'failed',
        {
          errorCode: error.code,
          errorMessage: error.message,
          recipientEmail,
        }
      )

      return { success: false, error: error.message }
    }
  }

  async sendBulkNotifications(
    notifications: Array<{
      notification: NotificationDocument
      recipientEmail: string
      recipientName?: string
    }>
  ): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
    const results = []

    // Add to queue for processing
    for (const { notification, recipientEmail, recipientName } of notifications) {
      const emailJob: EmailJob = {
        to: recipientEmail,
        subject: notification.title,
        html: '',
        text: notification.message,
        notificationId: notification._id.toString(),
        userId: notification.userId.toString(),
        type: notification.type,
        metadata: { recipientName, ...notification.metadata },
        retryCount: 0,
        maxRetries: this.maxRetries
      }

      this.emailQueue.push(emailJob)
    }

    // Process queue
    await this.processEmailQueue()

    return results
  }

  async queueEmail(emailJob: EmailJob): Promise<void> {
    this.emailQueue.push(emailJob)
    
    if (!this.isProcessingQueue) {
      this.processEmailQueue()
    }
  }

  private async processEmailQueue(): Promise<void> {
    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.emailQueue.length > 0) {
      const job = this.emailQueue.shift()
      if (!job) continue

      try {
        await this.processEmailJob(job)
        await new Promise(resolve => setTimeout(resolve, 100)) // Rate limiting
      } catch (error) {
        this.logger.error(`Failed to process email job: ${error.message}`)
        
        // Retry logic
        if (job.retryCount < job.maxRetries) {
          job.retryCount++
          setTimeout(() => {
            this.emailQueue.push(job)
          }, this.retryDelay * job.retryCount)
        } else {
          // Track final failure
          await this.analyticsService.trackEvent(
            job.notificationId as any,
            job.userId as any,
            job.type,
            'email',
            'failed',
            {
              errorMessage: error.message,
              finalFailure: true,
              retryCount: job.retryCount
            }
          )
        }
      }
    }

    this.isProcessingQueue = false
  }

  private async processEmailJob(job: EmailJob): Promise<void> {
    const mailOptions = {
      from: {
        name: process.env.SMTP_FROM_NAME || 'Betting Platform',
        address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      },
      to: job.to,
      subject: job.subject,
      text: job.text,
      html: job.html,
      headers: {
        'X-Notification-ID': job.notificationId,
        'X-Notification-Type': job.type,
        'List-Unsubscribe': `<${this.generateUnsubscribeUrl(job.userId, job.to)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }

    const result = await this.transporter.sendMail(mailOptions)

    // Track successful send
    await this.analyticsService.trackEvent(
      job.notificationId as any,
      job.userId as any,
      job.type,
      'email',
      'sent',
      {
        messageId: result.messageId,
        recipientEmail: job.to,
        retryCount: job.retryCount
      }
    )
  }

  private startQueueProcessor(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      if (!this.isProcessingQueue && this.emailQueue.length > 0) {
        this.processEmailQueue()
      }
    }, 30000)
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      this.logger.log('SMTP connection verified successfully')
      return true
    } catch (error) {
      this.logger.error(`SMTP connection verification failed: ${error.message}`)
      return false
    }
  }

  async trackEmailOpened(notificationId: string, userId: string, metadata: any = {}): Promise<void> {
    await this.analyticsService.trackEvent(
      notificationId as any,
      userId as any,
      'email',
      'email',
      'opened',
      metadata
    )
  }

  async trackEmailClicked(notificationId: string, userId: string, link: string, metadata: any = {}): Promise<void> {
    await this.analyticsService.trackEvent(
      notificationId as any,
      userId as any,
      'email',
      'email',
      'clicked',
      { link, ...metadata }
    )
  }

  async handleUnsubscribe(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const decoded = this.decodeUnsubscribeToken(token)
      
      // Update user preferences to disable email notifications
      // This would typically update the user's notification preferences
      // For now, we'll just log it
      this.logger.log(`Unsubscribe request for user ${decoded.userId}, email ${decoded.email}`)
      
      return { success: true }
    } catch (error) {
      this.logger.error(`Failed to process unsubscribe: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  private async renderEmailTemplate(templateName: string, data: any): Promise<EmailTemplate> {
    const template = this.templates.get(templateName)
    
    if (template) {
      const html = template(data)
      return {
        subject: data.title || 'Notification',
        html,
        text: this.htmlToText(html)
      }
    }

    // Fallback to default template
    return this.generateDefaultEmailTemplate(data)
  }

  private generateDefaultEmailTemplate(data: any): EmailTemplate {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    const unsubscribeUrl = this.generateUnsubscribeUrl(data.notification?.userId, data.recipientEmail)
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #1a365d; padding: 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px 20px; }
          .content h2 { color: #1a365d; margin-top: 0; }
          .button { display: inline-block; padding: 12px 24px; background-color: #3182ce; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .button:hover { background-color: #2c5aa0; }
          .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          .footer a { color: #3182ce; text-decoration: none; }
          .tracking-pixel { display: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Betting Platform</h1>
          </div>
          <div class="content">
            ${data.recipientName ? `<p>Hello ${data.recipientName},</p>` : '<p>Hello,</p>'}
            <h2>${data.title}</h2>
            <p>${data.message.replace(/\n/g, '<br>')}</p>
            ${this.generateActionButton(data)}
          </div>
          <div class="footer">
            <p>This email was sent to you because you have an account with Betting Platform.</p>
            <p><a href="${unsubscribeUrl}">Unsubscribe from these emails</a></p>
            <p>&copy; ${new Date().getFullYear()} Betting Platform. All rights reserved.</p>
          </div>
        </div>
        <img src="${baseUrl}/api/notifications/track/opened/${data.notification?._id}" width="1" height="1" class="tracking-pixel" alt="">
      </body>
      </html>
    `

    return {
      subject: data.title,
      html,
      text: this.htmlToText(html)
    }
  }

  private generateDefaultHtml(content: string, notification: NotificationDocument, recipientName?: string): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    const unsubscribeUrl = this.generateUnsubscribeUrl(notification.userId.toString(), '')
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #1a365d; padding: 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
          .content { padding: 30px 20px; }
          .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          .footer a { color: #3182ce; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Betting Platform</h1>
          </div>
          <div class="content">
            ${recipientName ? `<p>Hello ${recipientName},</p>` : '<p>Hello,</p>'}
            <p>${content.replace(/\n/g, '<br>')}</p>
          </div>
          <div class="footer">
            <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
            <p>&copy; ${new Date().getFullYear()} Betting Platform. All rights reserved.</p>
          </div>
        </div>
        <img src="${baseUrl}/api/notifications/track/opened/${notification._id}" width="1" height="1" style="display:none;" alt="">
      </body>
      </html>
    `
  }

  private generateActionButton(data: any): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    let buttonText = ''
    let buttonUrl = ''

    switch (data.type || data.notification?.type) {
      case 'bet_placed':
      case 'bet_won':
      case 'bet_lost':
      case 'bet_void':
        buttonText = 'View Bet Details'
        buttonUrl = `${baseUrl}/bets/${data.betId || data.metadata?.betId}`
        break
      case 'deposit_success':
      case 'withdrawal_success':
        buttonText = 'View Transaction'
        buttonUrl = `${baseUrl}/wallet/transactions`
        break
      case 'kyc_approved':
      case 'kyc_rejected':
        buttonText = 'View KYC Status'
        buttonUrl = `${baseUrl}/kyc`
        break
      case 'security_alert':
        buttonText = 'Review Security'
        buttonUrl = `${baseUrl}/security`
        break
      case 'promotion':
        buttonText = 'View Promotion'
        buttonUrl = `${baseUrl}/promotions`
        break
      default:
        buttonText = 'Visit Dashboard'
        buttonUrl = `${baseUrl}/dashboard`
    }

    if (buttonText && buttonUrl) {
      const trackingUrl = `${buttonUrl}?utm_source=email&utm_medium=notification&utm_campaign=${data.type}`
      return `<p style="text-align: center; margin: 30px 0;">
        <a href="${trackingUrl}" class="button" onclick="fetch('${baseUrl}/api/notifications/track/clicked/${data.notification?._id}?link=${encodeURIComponent(buttonUrl)}')">${buttonText}</a>
      </p>`
    }

    return ''
  }

  private generateUnsubscribeUrl(userId: string, email: string): string {
    const token = this.generateUnsubscribeToken(userId, email)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    return `${baseUrl}/unsubscribe?token=${token}`
  }

  private generateUnsubscribeToken(userId: string, email: string): string {
    const tokenData: UnsubscribeToken = {
      userId,
      email,
      timestamp: Date.now()
    }
    
    // In production, this should be a proper JWT token with signing
    return Buffer.from(JSON.stringify(tokenData)).toString('base64url')
  }

  private decodeUnsubscribeToken(token: string): UnsubscribeToken {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8')
      return JSON.parse(decoded)
    } catch (error) {
      throw new Error('Invalid unsubscribe token')
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  private async createDefaultTemplates(templatesDir: string): Promise<void> {
    const templates = {
      'bet_placed': {
        subject: 'Bet Placed Successfully - {{betId}}',
        content: `
          <h2>Bet Placed Successfully! 🎯</h2>
          <p>Your bet has been placed successfully.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Bet Details:</h3>
            <p><strong>Bet ID:</strong> {{betId}}</p>
            <p><strong>Stake:</strong> {{formatCurrency stake currency}}</p>
            <p><strong>Potential Win:</strong> {{formatCurrency potentialWin currency}}</p>
            <p><strong>Total Odds:</strong> {{totalOdds}}</p>
          </div>

          {{#if selections}}
          <h3>Your Selections:</h3>
          {{#each selections}}
          <div style="border-left: 4px solid #3182ce; padding-left: 15px; margin: 10px 0;">
            <p><strong>{{eventName}}</strong></p>
            <p>{{marketName}}: {{selectionName}} @ {{odds}}</p>
          </div>
          {{/each}}
          {{/if}}

          <p>Good luck with your bet! 🍀</p>
        `
      },
      'bet_won': {
        subject: 'Congratulations! Your Bet Won! 🎉',
        content: `
          <h2>Congratulations! Your Bet Won! 🎉</h2>
          <p>Great news! Your bet was successful and winnings have been credited to your account.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Winning Details:</h3>
            <p><strong>Bet ID:</strong> {{betId}}</p>
            <p><strong>Stake:</strong> {{formatCurrency stake currency}}</p>
            <p><strong>Winnings:</strong> {{formatCurrency winAmount currency}}</p>
            <p><strong>Profit:</strong> {{formatCurrency (subtract winAmount stake) currency}}</p>
          </div>

          <p>Your winnings have been automatically credited to your wallet. Keep up the winning streak! 🚀</p>
        `
      },
      'deposit_success': {
        subject: 'Deposit Successful - {{formatCurrency amount currency}}',
        content: `
          <h2>Deposit Successful! 💰</h2>
          <p>Your deposit has been processed successfully and added to your wallet.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Transaction Details:</h3>
            <p><strong>Amount:</strong> {{formatCurrency amount currency}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
            <p><strong>Date:</strong> {{formatDate timestamp}}</p>
          </div>

          <p>You can now use these funds to place bets. Happy betting! 🎯</p>
        `
      },
      'kyc_approved': {
        subject: 'Account Verified Successfully ✅',
        content: `
          <h2>Account Verified Successfully! ✅</h2>
          <p>Congratulations! Your account has been successfully verified.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>What's Next?</h3>
            <ul>
              <li>✅ Make deposits and withdrawals without limits</li>
              <li>✅ Access all betting features</li>
              <li>✅ Participate in exclusive promotions</li>
              <li>✅ Enjoy higher betting limits</li>
            </ul>
          </div>

          <p>Thank you for completing the verification process. Start betting with confidence! 🚀</p>
        `
      },
      'security_alert': {
        subject: '🚨 Security Alert - Unusual Activity Detected',
        content: `
          <h2>🚨 Security Alert</h2>
          <p>We detected unusual activity on your account and wanted to let you know immediately.</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
            <h3>Activity Details:</h3>
            <p><strong>Activity:</strong> {{activity}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p><strong>Time:</strong> {{formatDate timestamp}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
          </div>

          <p><strong>If this was you:</strong> No action is needed.</p>
          <p><strong>If this wasn't you:</strong> Please secure your account immediately by changing your password and enabling 2FA.</p>
          
          <p>Your account security is our top priority. 🔒</p>
        `
      }
    }

    for (const [templateName, template] of Object.entries(templates)) {
      const templatePath = path.join(templatesDir, `${templateName}.hbs`)
      const templateContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #1a365d; padding: 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .content h2 { color: #1a365d; margin-top: 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3182ce; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button:hover { background-color: #2c5aa0; }
    .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
    .footer a { color: #3182ce; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Betting Platform</h1>
    </div>
    <div class="content">
      {{#if recipientName}}<p>Hello {{recipientName}},</p>{{else}}<p>Hello,</p>{{/if}}
      ${template.content}
    </div>
    <div class="footer">
      <p>This email was sent to you because you have an account with Betting Platform.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe from these emails</a></p>
      <p>&copy; {{currentYear}} Betting Platform. All rights reserved.</p>
    </div>
  </div>
  <img src="{{trackingPixelUrl}}" width="1" height="1" style="display:none;" alt="">
</body>
</html>
      `.trim()

      fs.writeFileSync(templatePath, templateContent)
      this.logger.log(`Created default email template: ${templateName}`)
    }
  }
}