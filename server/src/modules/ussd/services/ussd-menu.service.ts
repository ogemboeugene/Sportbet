import { Injectable } from '@nestjs/common';
import { UssdSessionService } from './ussd-session.service';
import { UsersService } from '../../users/users.service';
import { WalletService } from '../../wallet/wallet.service';
import { BettingService } from '../../betting/services/betting.service';

@Injectable()
export class UssdMenuService {
  constructor(
    private readonly sessionService: UssdSessionService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly bettingService: BettingService,
  ) {}

  async handleMainMenu(session: any, input: string): Promise<string> {
    if (!input) {
      // First time or returning to main menu
      return this.getMainMenuText();
    }

    switch (input) {
      case '1':
        await this.sessionService.navigateToMenu(session.sessionId, 'login');
        return this.getLoginMenuText();
      
      case '2':
        await this.sessionService.navigateToMenu(session.sessionId, 'register');
        return this.getRegisterMenuText();
      
      case '3':
        await this.sessionService.navigateToMenu(session.sessionId, 'help');
        return this.getHelpMenuText();
      
      case '0':
        await this.sessionService.endSession(session.sessionId);
        return 'END Thank you for using our betting service!';
      
      default:
        return this.getMainMenuText('Invalid option. Please try again.');
    }
  }

  async handleLogin(session: any, input: string, fullInput: string[]): Promise<string> {
    const step = await this.sessionService.getSessionData(session.sessionId, 'loginStep') || 'phone';
    
    if (input === '0') {
      await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
      return this.getMainMenuText();
    }

    if (input === '*') {
      const previousMenu = await this.sessionService.goBack(session.sessionId);
      if (previousMenu === 'main_menu') {
        return this.getMainMenuText();
      }
    }

    switch (step) {
      case 'phone':
        if (!input) {
          return 'CON Enter your phone number:\n\n0. Back to main menu';
        }
        
        // Validate phone number format
        if (!this.isValidPhoneNumber(input)) {
          return 'CON Invalid phone number format.\nEnter your phone number:\n\n0. Back to main menu';
        }
        
        await this.sessionService.setSessionData(session.sessionId, 'loginPhone', input);
        await this.sessionService.setSessionData(session.sessionId, 'loginStep', 'pin');
        return 'CON Enter your PIN:\n\n0. Back to main menu';
      
      case 'pin':
        if (!input) {
          return 'CON Enter your PIN:\n\n0. Back to main menu';
        }
        
        const phoneNumber = await this.sessionService.getSessionData(session.sessionId, 'loginPhone');
        
        try {
          // Authenticate user with phone and PIN
          const user = await this.authenticateUser(phoneNumber, input);
          
          if (user) {
            await this.sessionService.setSessionData(session.sessionId, 'userId', user._id.toString());
            await this.sessionService.setSessionData(session.sessionId, 'userPhone', phoneNumber);
            await this.sessionService.navigateToMenu(session.sessionId, 'account_menu');
            return this.getAccountMenuText(user.profile?.firstName || 'User');
          } else {
            await this.sessionService.setSessionData(session.sessionId, 'loginStep', 'phone');
            return 'CON Invalid credentials.\nEnter your phone number:\n\n0. Back to main menu';
          }
        } catch (error) {
          console.error('Login error:', error);
          return 'CON Login failed. Please try again.\nEnter your phone number:\n\n0. Back to main menu';
        }
      
      default:
        await this.sessionService.setSessionData(session.sessionId, 'loginStep', 'phone');
        return 'CON Enter your phone number:\n\n0. Back to main menu';
    }
  }

  async handleRegister(session: any, input: string, fullInput: string[]): Promise<string> {
    const step = await this.sessionService.getSessionData(session.sessionId, 'registerStep') || 'phone';
    
    if (input === '0') {
      await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
      return this.getMainMenuText();
    }

    switch (step) {
      case 'phone':
        if (!input) {
          return 'CON Enter your phone number:\n\n0. Back to main menu';
        }
        
        if (!this.isValidPhoneNumber(input)) {
          return 'CON Invalid phone number format.\nEnter your phone number:\n\n0. Back to main menu';
        }
        
        // Check if phone number already exists
        const existingUser = await this.usersService.findByPhone(input);
        if (existingUser) {
          return 'CON Phone number already registered.\nPlease login instead.\n\n0. Back to main menu';
        }
        
        await this.sessionService.setSessionData(session.sessionId, 'registerPhone', input);
        await this.sessionService.setSessionData(session.sessionId, 'registerStep', 'name');
        return 'CON Enter your full name:\n\n0. Back to main menu';
      
      case 'name':
        if (!input || input.trim().length < 2) {
          return 'CON Name too short.\nEnter your full name:\n\n0. Back to main menu';
        }
        
        await this.sessionService.setSessionData(session.sessionId, 'registerName', input.trim());
        await this.sessionService.setSessionData(session.sessionId, 'registerStep', 'pin');
        return 'CON Create a 4-digit PIN:\n\n0. Back to main menu';
      
      case 'pin':
        if (!input || !/^\d{4}$/.test(input)) {
          return 'CON PIN must be 4 digits.\nCreate a 4-digit PIN:\n\n0. Back to main menu';
        }
        
        await this.sessionService.setSessionData(session.sessionId, 'registerPin', input);
        await this.sessionService.setSessionData(session.sessionId, 'registerStep', 'confirm_pin');
        return 'CON Confirm your PIN:\n\n0. Back to main menu';
      
      case 'confirm_pin':
        const originalPin = await this.sessionService.getSessionData(session.sessionId, 'registerPin');
        
        if (input !== originalPin) {
          await this.sessionService.setSessionData(session.sessionId, 'registerStep', 'pin');
          return 'CON PINs do not match.\nCreate a 4-digit PIN:\n\n0. Back to main menu';
        }
        
        try {
          const phoneNumber = await this.sessionService.getSessionData(session.sessionId, 'registerPhone');
          const fullName = await this.sessionService.getSessionData(session.sessionId, 'registerName');
          
          // Create user account
          const user = await this.createUserAccount(phoneNumber, fullName, input);
          
          if (user) {
            await this.sessionService.setSessionData(session.sessionId, 'userId', user._id.toString());
            await this.sessionService.setSessionData(session.sessionId, 'userPhone', phoneNumber);
            await this.sessionService.navigateToMenu(session.sessionId, 'account_menu');
            return `CON Registration successful!\nWelcome ${fullName}!\n\n${this.getAccountMenuText(fullName)}`;
          } else {
            return 'END Registration failed. Please try again later.';
          }
        } catch (error) {
          console.error('Registration error:', error);
          return 'END Registration failed. Please try again later.';
        }
      
      default:
        await this.sessionService.setSessionData(session.sessionId, 'registerStep', 'phone');
        return 'CON Enter your phone number:\n\n0. Back to main menu';
    }
  }

  async handleAccountMenu(session: any, input: string): Promise<string> {
    if (!input) {
      const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
      if (!userId) {
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return this.getMainMenuText();
      }
      
      const user = await this.usersService.findById(userId);
      return this.getAccountMenuText(user?.profile?.firstName || 'User');
    }

    switch (input) {
      case '1':
        await this.sessionService.navigateToMenu(session.sessionId, 'balance');
        return await this.handleBalance(session);
      
      case '2':
        await this.sessionService.navigateToMenu(session.sessionId, 'betting_menu');
        return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back\n*. Main Menu';
      
      case '3':
        await this.sessionService.navigateToMenu(session.sessionId, 'bet_history');
        return await this.handleBetHistory(session, '');
      
      case '4':
        await this.sessionService.navigateToMenu(session.sessionId, 'help');
        return this.getHelpMenuText();
      
      case '0':
        await this.sessionService.endSession(session.sessionId);
        return 'END Thank you for using our betting service!';
      
      case '*':
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return this.getMainMenuText();
      
      default:
        const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
        const user = await this.usersService.findById(userId);
        return this.getAccountMenuText(user?.profile?.firstName || 'User', 'Invalid option. Please try again.');
    }
  }

  async handleBalance(session: any): Promise<string> {
    try {
      const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
      if (!userId) {
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return this.getMainMenuText();
      }

      const wallet = await this.walletService.getWallet(userId);
      const balance = wallet?.balance || 0;
      
      return `CON ACCOUNT BALANCE\nBalance: $${balance.toFixed(2)}\n\nTo deposit funds, please use our website or mobile app.\n\n0. Back to Account Menu\n*. Main Menu`;
    } catch (error) {
      console.error('Balance check error:', error);
      return 'CON Unable to retrieve balance.\nPlease try again later.\n\n0. Back to Account Menu\n*. Main Menu';
    }
  }

  async handleBetHistory(session: any, input: string): Promise<string> {
    try {
      const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
      if (!userId) {
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return this.getMainMenuText();
      }

      const bets = await this.bettingService.getUserBets(userId, { limit: 5 });
      
      if (!bets || bets.length === 0) {
        return 'CON BET HISTORY\nNo bets found.\n\n0. Back to Account Menu\n*. Main Menu';
      }

      let response = 'CON BET HISTORY (Last 5)\n';
      bets.forEach((bet, index) => {
        const status = bet.status.toUpperCase();
        const amount = bet.stake.toFixed(2);
        response += `${index + 1}. $${amount} - ${status}\n`;
      });
      
      response += '\n0. Back to Account Menu\n*. Main Menu';
      return response;
    } catch (error) {
      console.error('Bet history error:', error);
      return 'CON Unable to retrieve bet history.\nPlease try again later.\n\n0. Back to Account Menu\n*. Main Menu';
    }
  }

  async handleHelp(session: any, input: string): Promise<string> {
    if (!input) {
      return this.getHelpMenuText();
    }

    switch (input) {
      case '1':
        return 'CON HOW TO BET\n1. Login to your account\n2. Go to Betting Menu\n3. Select a sport\n4. Choose an event\n5. Enter stake amount\n6. Confirm bet\n\n0. Back to Help\n*. Main Menu';
      
      case '2':
        return 'CON ACCOUNT HELP\n- Register with phone number\n- Create 4-digit PIN\n- Check balance anytime\n- View bet history\n- Deposit via website/app\n\n0. Back to Help\n*. Main Menu';
      
      case '3':
        return 'CON NAVIGATION HELP\n- Enter numbers to select options\n- Press 0 to go back\n- Press * for main menu\n- Session expires after 5 minutes\n\n0. Back to Help\n*. Main Menu';
      
      case '4':
        return 'CON SUPPORT\nFor assistance:\n- Call: +1-800-BET-HELP\n- Email: support@betting.com\n- Website: www.betting.com\n\n0. Back to Help\n*. Main Menu';
      
      case '0':
        const previousMenu = await this.sessionService.goBack(session.sessionId);
        if (previousMenu === 'main_menu') {
          return this.getMainMenuText();
        } else if (previousMenu === 'account_menu') {
          const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
          const user = await this.usersService.findById(userId);
          return this.getAccountMenuText(user?.profile?.firstName || 'User');
        }
        return this.getMainMenuText();
      
      case '*':
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return this.getMainMenuText();
      
      default:
        return this.getHelpMenuText('Invalid option. Please try again.');
    }
  }

  private getMainMenuText(error?: string): string {
    let text = 'CON WELCOME TO BETTING PLATFORM\n';
    if (error) {
      text += `${error}\n\n`;
    }
    text += '1. Login\n2. Register\n3. Help\n0. Exit';
    return text;
  }

  private getLoginMenuText(): string {
    return 'CON LOGIN\nEnter your phone number:\n\n0. Back to main menu';
  }

  private getRegisterMenuText(): string {
    return 'CON REGISTER\nEnter your phone number:\n\n0. Back to main menu';
  }

  private getAccountMenuText(name: string, error?: string): string {
    let text = `CON Welcome ${name}!\n`;
    if (error) {
      text += `${error}\n\n`;
    }
    text += '1. Check Balance\n2. Betting Menu\n3. Bet History\n4. Help\n0. Logout\n*. Main Menu';
    return text;
  }

  private getHelpMenuText(error?: string): string {
    let text = 'CON HELP MENU\n';
    if (error) {
      text += `${error}\n\n`;
    }
    text += '1. How to Bet\n2. Account Help\n3. Navigation Help\n4. Contact Support\n0. Back\n*. Main Menu';
    return text;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation - adjust regex based on your requirements
    return /^\+?[\d\s\-\(\)]{10,15}$/.test(phone.trim());
  }

  private async authenticateUser(phoneNumber: string, pin: string): Promise<any> {
    try {
      // This is a simplified authentication - in production, you'd hash the PIN
      const user = await this.usersService.findByPhone(phoneNumber);
      if (user && user.ussdPin === pin) {
        return user;
      }
      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  private async createUserAccount(phoneNumber: string, fullName: string, pin: string): Promise<any> {
    try {
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const userData = {
        email: `${phoneNumber.replace(/\D/g, '')}@ussd.betting.com`, // Generate email from phone
        profile: {
          firstName,
          lastName,
          phoneNumber,
        },
        ussdPin: pin, // In production, hash this
        emailVerified: false,
        kycStatus: 'pending',
      };
      
      return await this.usersService.createUssdUser(userData);
    } catch (error) {
      console.error('User creation error:', error);
      return null;
    }
  }
}