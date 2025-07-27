import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { 
  NotificationTemplate, 
  NotificationTemplateDocument 
} from '../../../database/schemas/notification-template.schema'

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name)

  constructor(
    @InjectModel(NotificationTemplate.name)
    private templateModel: Model<NotificationTemplateDocument>,
  ) {}

  async findByTemplateId(templateId: string): Promise<NotificationTemplateDocument> {
    return this.templateModel.findOne({ 
      templateId, 
      isActive: true 
    }).exec()
  }

  async findByTypeAndChannel(type: string, channel: string): Promise<NotificationTemplateDocument> {
    return this.templateModel.findOne({ 
      type, 
      channel, 
      isActive: true 
    }).exec()
  }

  async findAll(): Promise<NotificationTemplateDocument[]> {
    return this.templateModel.find({ isActive: true }).exec()
  }

  async create(templateData: Partial<NotificationTemplate>): Promise<NotificationTemplateDocument> {
    const template = new this.templateModel(templateData)
    return template.save()
  }

  async update(
    templateId: string, 
    updateData: Partial<NotificationTemplate>
  ): Promise<NotificationTemplateDocument> {
    return this.templateModel
      .findOneAndUpdate(
        { templateId },
        { ...updateData, lastModifiedBy: updateData.lastModifiedBy },
        { new: true }
      )
      .exec()
  }

  async deactivate(templateId: string): Promise<NotificationTemplateDocument> {
    return this.templateModel
      .findOneAndUpdate(
        { templateId },
        { isActive: false },
        { new: true }
      )
      .exec()
  }

  renderTemplate(
    template: NotificationTemplateDocument, 
    data: Record<string, any> = {}
  ): { subject: string; content: string; htmlContent?: string } {
    try {
      const subject = this.interpolateString(template.subject, data)
      const content = this.interpolateString(template.content, data)
      const htmlContent = template.htmlContent 
        ? this.interpolateString(template.htmlContent, data)
        : undefined

      return { subject, content, htmlContent }
    } catch (error) {
      this.logger.error(`Failed to render template ${template.templateId}: ${error.message}`)
      throw error
    }
  }

  private interpolateString(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key)
      return value !== undefined ? String(value) : match
    })
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  async getTemplate(type: string, channel: string): Promise<NotificationTemplateDocument> {
    return this.findByTypeAndChannel(type, channel);
  }

  async seedDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      // Betting notifications
      {
        templateId: 'bet_placed_email',
        name: 'Bet Placed - Email',
        type: 'bet_placed',
        channel: 'email',
        subject: 'Bet Placed Successfully - {{betId}}',
        content: 'Your bet of {{stake}} {{currency}} has been placed successfully. Bet ID: {{betId}}',
        htmlContent: `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Bet Details:</h3>
            <p><strong>Bet ID:</strong> {{betId}}</p>
            <p><strong>Stake:</strong> {{stake}} {{currency}}</p>
            <p><strong>Potential Win:</strong> {{potentialWin}} {{currency}}</p>
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
        `,
        variables: ['stake', 'currency', 'betId', 'selections', 'potentialWin', 'totalOdds'],
        defaultPriority: 'medium'
      },
      {
        templateId: 'bet_won_email',
        name: 'Bet Won - Email',
        type: 'bet_won',
        channel: 'email',
        subject: 'Congratulations! Your Bet Won! 🎉',
        content: 'Great news! Your bet was successful and winnings have been credited to your account. Bet ID: {{betId}}, Winnings: {{winAmount}} {{currency}}',
        htmlContent: `
          <h2>Congratulations! Your Bet Won! 🎉</h2>
          <p>Great news! Your bet was successful and winnings have been credited to your account.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Winning Details:</h3>
            <p><strong>Bet ID:</strong> {{betId}}</p>
            <p><strong>Stake:</strong> {{stake}} {{currency}}</p>
            <p><strong>Winnings:</strong> {{winAmount}} {{currency}}</p>
            <p><strong>Profit:</strong> {{profit}} {{currency}}</p>
          </div>

          <p>Your winnings have been automatically credited to your wallet. Keep up the winning streak! 🚀</p>
        `,
        variables: ['winAmount', 'currency', 'betId', 'stake', 'profit'],
        defaultPriority: 'high'
      },
      {
        templateId: 'bet_won_push',
        name: 'Bet Won - Push',
        type: 'bet_won',
        channel: 'push',
        subject: 'Congratulations! You won!',
        content: 'Your bet won! You\'ve earned {{winAmount}} {{currency}}. Bet ID: {{betId}}',
        variables: ['winAmount', 'currency', 'betId'],
        defaultPriority: 'high'
      },
      {
        templateId: 'bet_lost_in_app',
        name: 'Bet Lost - In App',
        type: 'bet_lost',
        channel: 'in_app',
        subject: 'Bet Result',
        content: 'Your bet didn\'t win this time. Better luck next time! Bet ID: {{betId}}',
        variables: ['betId'],
        defaultPriority: 'low'
      },
      // Wallet notifications
      {
        templateId: 'deposit_success_email',
        name: 'Deposit Success - Email',
        type: 'deposit_success',
        channel: 'email',
        subject: 'Deposit Successful - {{amount}} {{currency}}',
        content: 'Your deposit of {{amount}} {{currency}} has been processed successfully. Transaction ID: {{transactionId}}',
        htmlContent: `
          <h2>Deposit Successful! 💰</h2>
          <p>Your deposit has been processed successfully and added to your wallet.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Transaction Details:</h3>
            <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
            <p><strong>Date:</strong> {{timestamp}}</p>
          </div>

          <p>You can now use these funds to place bets. Happy betting! 🎯</p>
        `,
        variables: ['amount', 'currency', 'transactionId', 'paymentMethod', 'timestamp'],
        defaultPriority: 'medium'
      },
      {
        templateId: 'withdrawal_success_email',
        name: 'Withdrawal Success - Email',
        type: 'withdrawal_success',
        channel: 'email',
        subject: 'Withdrawal Processed - {{amount}} {{currency}}',
        content: 'Your withdrawal of {{amount}} {{currency}} has been processed successfully. Transaction ID: {{transactionId}}',
        htmlContent: `
          <h2>Withdrawal Processed! 💸</h2>
          <p>Your withdrawal request has been processed successfully.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Withdrawal Details:</h3>
            <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
            <p><strong>Transaction ID:</strong> {{transactionId}}</p>
            <p><strong>Withdrawal Method:</strong> {{withdrawalMethod}}</p>
            <p><strong>Processing Time:</strong> {{processingTime}}</p>
            <p><strong>Date:</strong> {{timestamp}}</p>
          </div>

          <p>The funds should arrive in your account within the specified processing time. Thank you for using our platform! 🙏</p>
        `,
        variables: ['amount', 'currency', 'transactionId', 'withdrawalMethod', 'processingTime', 'timestamp'],
        defaultPriority: 'high'
      },
      {
        templateId: 'withdrawal_success_sms',
        name: 'Withdrawal Success - SMS',
        type: 'withdrawal_success',
        channel: 'sms',
        subject: 'Withdrawal Processed',
        content: 'Your withdrawal of {{amount}} {{currency}} has been processed. Ref: {{transactionId}}',
        variables: ['amount', 'currency', 'transactionId'],
        defaultPriority: 'high'
      },
      // KYC notifications
      {
        templateId: 'kyc_approved_email',
        name: 'KYC Approved - Email',
        type: 'kyc_approved',
        channel: 'email',
        subject: 'Account Verified Successfully ✅',
        content: 'Congratulations! Your account has been verified. You can now access all features.',
        htmlContent: `
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
        `,
        variables: [],
        defaultPriority: 'high'
      },
      {
        templateId: 'kyc_rejected_email',
        name: 'KYC Rejected - Email',
        type: 'kyc_rejected',
        channel: 'email',
        subject: 'Account Verification Required',
        content: 'We need additional information to verify your account. Reason: {{reason}}',
        htmlContent: `
          <h2>Additional Verification Required</h2>
          <p>We need additional information to complete your account verification.</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <h3>Reason for Additional Review:</h3>
            <p>{{reason}}</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Next Steps:</h3>
            <ol>
              <li>Review the reason above</li>
              <li>Prepare the required documents</li>
              <li>Upload clear, high-quality images</li>
              <li>Submit for review</li>
            </ol>
          </div>

          <p>If you have any questions, please contact our support team. We're here to help! 💬</p>
        `,
        variables: ['reason'],
        defaultPriority: 'high'
      },
      // Security notifications
      {
        templateId: 'security_alert_email',
        name: 'Security Alert - Email',
        type: 'security_alert',
        channel: 'email',
        subject: '🚨 Security Alert - Unusual Activity Detected',
        content: 'Suspicious activity detected on your account. If this wasn\'t you, please contact support immediately.',
        htmlContent: `
          <h2>🚨 Security Alert</h2>
          <p>We detected unusual activity on your account and wanted to let you know immediately.</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
            <h3>Activity Details:</h3>
            <p><strong>Activity:</strong> {{activity}}</p>
            <p><strong>Location:</strong> {{location}}</p>
            <p><strong>Time:</strong> {{timestamp}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>If this was you:</strong> No action is needed.</p>
            <p><strong>If this wasn't you:</strong> Please secure your account immediately by:</p>
            <ul>
              <li>Changing your password</li>
              <li>Enabling two-factor authentication</li>
              <li>Reviewing your recent account activity</li>
              <li>Contacting our support team</li>
            </ul>
          </div>
          
          <p>Your account security is our top priority. 🔒</p>
        `,
        variables: ['activity', 'location', 'timestamp', 'ipAddress'],
        defaultPriority: 'urgent'
      },
      {
        templateId: 'password_changed_email',
        name: 'Password Changed - Email',
        type: 'password_changed',
        channel: 'email',
        subject: 'Password Changed Successfully',
        content: 'Your password has been changed successfully. If you didn\'t make this change, please contact support.',
        htmlContent: `
          <h2>Password Changed Successfully</h2>
          <p>Your account password has been changed successfully.</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Change Details:</h3>
            <p><strong>Date & Time:</strong> {{timestamp}}</p>
            <p><strong>IP Address:</strong> {{ipAddress}}</p>
            <p><strong>Location:</strong> {{location}}</p>
          </div>

          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <p><strong>If you didn't make this change:</strong></p>
            <ul>
              <li>Contact our support team immediately</li>
              <li>Your account may have been compromised</li>
              <li>We'll help you secure your account</li>
            </ul>
          </div>

          <p>If you made this change, no further action is required. Your account is secure! 🔐</p>
        `,
        variables: ['timestamp', 'ipAddress', 'location'],
        defaultPriority: 'high'
      },
      // Responsible gambling
      {
        templateId: 'limit_warning_email',
        name: 'Limit Warning - Email',
        type: 'limit_warning',
        channel: 'email',
        subject: 'Spending Limit Warning - {{percentage}}% Reached',
        content: 'You\'ve reached {{percentage}}% of your {{limitType}} limit. Current: {{current}}, Limit: {{limit}}',
        htmlContent: `
          <h2>Spending Limit Warning ⚠️</h2>
          <p>You've reached {{percentage}}% of your {{limitType}} spending limit.</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7;">
            <h3>Limit Status:</h3>
            <p><strong>Limit Type:</strong> {{limitType}}</p>
            <p><strong>Current Spending:</strong> {{current}} {{currency}}</p>
            <p><strong>Limit Amount:</strong> {{limit}} {{currency}}</p>
            <p><strong>Percentage Used:</strong> {{percentage}}%</p>
            <p><strong>Remaining:</strong> {{remaining}} {{currency}}</p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Responsible Gambling Reminder:</h3>
            <ul>
              <li>Set limits that you can afford</li>
              <li>Take regular breaks from betting</li>
              <li>Never chase losses</li>
              <li>Seek help if gambling becomes a problem</li>
            </ul>
          </div>

          <p>Remember, gambling should be fun and within your means. 🎯</p>
        `,
        variables: ['percentage', 'limitType', 'current', 'limit', 'currency', 'remaining'],
        defaultPriority: 'medium'
      },
      {
        templateId: 'limit_warning_push',
        name: 'Limit Warning - Push',
        type: 'limit_warning',
        channel: 'push',
        subject: 'Spending Limit Warning',
        content: 'You\'ve reached {{percentage}}% of your {{limitType}} limit. Current: {{current}}, Limit: {{limit}}',
        variables: ['percentage', 'limitType', 'current', 'limit'],
        defaultPriority: 'medium'
      },
      {
        templateId: 'session_timeout_in_app',
        name: 'Session Timeout - In App',
        type: 'session_timeout',
        channel: 'in_app',
        subject: 'Session Timeout',
        content: 'You\'ve been playing for {{duration}} minutes. Consider taking a break.',
        variables: ['duration'],
        defaultPriority: 'medium'
      },
      // Promotional notifications
      {
        templateId: 'promotion_email',
        name: 'Promotion - Email',
        type: 'promotion',
        channel: 'email',
        subject: '🎉 {{promotionTitle}} - Limited Time Offer!',
        content: 'Don\'t miss out on our latest promotion: {{promotionTitle}}. {{promotionDescription}}',
        htmlContent: `
          <h2>🎉 {{promotionTitle}}</h2>
          <p>{{promotionDescription}}</p>
          
          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #b3d9ff;">
            <h3>Promotion Details:</h3>
            <p><strong>Offer:</strong> {{promotionTitle}}</p>
            <p><strong>Bonus:</strong> {{bonusAmount}} {{currency}}</p>
            <p><strong>Valid Until:</strong> {{expiryDate}}</p>
            <p><strong>Minimum Deposit:</strong> {{minDeposit}} {{currency}}</p>
            {{#if promoCode}}
            <p><strong>Promo Code:</strong> <code style="background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px;">{{promoCode}}</code></p>
            {{/if}}
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>How to Claim:</h3>
            <ol>
              <li>Make a qualifying deposit</li>
              {{#if promoCode}}<li>Enter promo code: {{promoCode}}</li>{{/if}}
              <li>Start betting and enjoy your bonus!</li>
            </ol>
          </div>

          <p><small>Terms and conditions apply. Must be 18+ to participate. Please gamble responsibly.</small></p>
        `,
        variables: ['promotionTitle', 'promotionDescription', 'bonusAmount', 'currency', 'expiryDate', 'minDeposit', 'promoCode'],
        defaultPriority: 'low'
      },
      // Welcome series
      {
        templateId: 'welcome_email',
        name: 'Welcome - Email',
        type: 'welcome',
        channel: 'email',
        subject: 'Welcome to Betting Platform! 🎯',
        content: 'Welcome to our platform! We\'re excited to have you join our community of sports betting enthusiasts.',
        htmlContent: `
          <h2>Welcome to Betting Platform! 🎯</h2>
          <p>We're excited to have you join our community of sports betting enthusiasts.</p>
          
          <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #b3d9ff;">
            <h3>Get Started:</h3>
            <ol>
              <li>✅ Complete your account verification</li>
              <li>💰 Make your first deposit</li>
              <li>🎯 Place your first bet</li>
              <li>🏆 Enjoy the excitement!</li>
            </ol>
          </div>

          <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
            <h3>Welcome Bonus:</h3>
            <p>Get a <strong>100% match bonus</strong> up to $100 on your first deposit!</p>
            <p>Use code: <code style="background-color: #f8f9fa; padding: 4px 8px; border-radius: 4px;">WELCOME100</code></p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Need Help?</h3>
            <p>Our support team is available 24/7 to assist you:</p>
            <ul>
              <li>📧 Email: support@bettingplatform.com</li>
              <li>💬 Live Chat: Available on our website</li>
              <li>📱 Phone: +1-800-BET-HELP</li>
            </ul>
          </div>

          <p>Welcome aboard and good luck with your bets! 🍀</p>
        `,
        variables: [],
        defaultPriority: 'medium'
      }
    ]

    for (const template of defaultTemplates) {
      const existing = await this.findByTemplateId(template.templateId)
      if (!existing) {
        await this.create({
          ...template,
          version: '1.0.0',
          createdBy: 'system'
        })
        this.logger.log(`Created default template: ${template.templateId}`)
      }
    }
  }
}