import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UssdRequestDto } from './dto/ussd-request.dto';
import { UssdSessionService } from './services/ussd-session.service';
import { UssdMenuService } from './services/ussd-menu.service';
import { UssdBettingService } from './services/ussd-betting.service';

@Injectable()
export class UssdService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: UssdSessionService,
    private readonly menuService: UssdMenuService,
    private readonly bettingService: UssdBettingService,
  ) {}

  async processUssdRequest(request: UssdRequestDto): Promise<string> {
    try {
      // Get or create session
      let session = await this.sessionService.getSession(request.sessionId);
      
      if (!session) {
        session = await this.sessionService.createSession({
          sessionId: request.sessionId,
          phoneNumber: request.phoneNumber,
          currentMenu: 'main_menu',
          sessionData: {},
          menuHistory: [],
          isActive: true,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        });
      }

      // Update session activity
      await this.sessionService.updateLastActivity(session.sessionId);

      // Parse user input
      const userInput = this.parseUserInput(request.text || '');
      
      // Process the request based on current menu and user input
      const response = await this.processMenuNavigation(session, userInput);
      
      return response;
    } catch (error) {
      console.error('Error processing USSD request:', error);
      return 'END An error occurred. Please try again later.';
    }
  }

  private parseUserInput(text: string): string[] {
    if (!text || text.trim() === '') {
      return [];
    }
    return text.split('*').filter(input => input.trim() !== '');
  }

  private async processMenuNavigation(session: any, userInput: string[]): Promise<string> {
    const currentInput = userInput[userInput.length - 1] || '';
    
    switch (session.currentMenu) {
      case 'main_menu':
        return await this.menuService.handleMainMenu(session, currentInput);
      
      case 'login':
        return await this.menuService.handleLogin(session, currentInput, userInput);
      
      case 'register':
        return await this.menuService.handleRegister(session, currentInput, userInput);
      
      case 'account_menu':
        return await this.menuService.handleAccountMenu(session, currentInput);
      
      case 'balance':
        return await this.menuService.handleBalance(session);
      
      case 'betting_menu':
        return await this.bettingService.handleBettingMenu(session, currentInput);
      
      case 'sports_list':
        return await this.bettingService.handleSportsList(session, currentInput);
      
      case 'events_list':
        return await this.bettingService.handleEventsList(session, currentInput);
      
      case 'bet_placement':
        return await this.bettingService.handleBetPlacement(session, currentInput, userInput);
      
      case 'bet_history':
        return await this.menuService.handleBetHistory(session, currentInput);
      
      case 'help':
        return await this.menuService.handleHelp(session, currentInput);
      
      default:
        return await this.menuService.handleMainMenu(session, '');
    }
  }
}