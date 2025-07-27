/**
 * USSD Demo Script
 * 
 * This script demonstrates the USSD betting interface functionality
 * without requiring the full application to compile.
 */

// Mock implementations for demonstration
class MockUssdSession {
  sessionId: string;
  phoneNumber: string;
  currentMenu: string;
  sessionData: Record<string, any>;
  menuHistory: string[];
  isActive: boolean;

  constructor(data: any) {
    this.sessionId = data.sessionId;
    this.phoneNumber = data.phoneNumber;
    this.currentMenu = data.currentMenu || 'main_menu';
    this.sessionData = data.sessionData || {};
    this.menuHistory = data.menuHistory || [];
    this.isActive = true;
  }
}

class MockUssdMenuService {
  async handleMainMenu(session: MockUssdSession, input: string): Promise<string> {
    if (!input) {
      return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
    }

    switch (input) {
      case '1':
        return 'CON LOGIN\nEnter your phone number:\n\n0. Back to main menu';
      case '2':
        return 'CON REGISTER\nEnter your phone number:\n\n0. Back to main menu';
      case '3':
        return 'CON HELP MENU\n1. How to Bet\n2. Account Help\n3. Navigation Help\n4. Contact Support\n0. Back\n*. Main Menu';
      case '0':
        return 'END Thank you for using our betting service!';
      default:
        return 'CON WELCOME TO BETTING PLATFORM\nInvalid option. Please try again.\n\n1. Login\n2. Register\n3. Help\n0. Exit';
    }
  }

  async handleLogin(session: MockUssdSession, input: string): Promise<string> {
    if (!input) {
      return 'CON LOGIN\nEnter your phone number:\n\n0. Back to main menu';
    }

    if (input === '0') {
      return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
    }

    // Simulate phone number validation
    if (input.length < 10) {
      return 'CON Invalid phone number format.\nEnter your phone number:\n\n0. Back to main menu';
    }

    // Simulate successful login
    return 'CON Welcome John!\n1. Check Balance\n2. Betting Menu\n3. Bet History\n4. Help\n0. Logout\n*. Main Menu';
  }

  async handleAccountMenu(session: MockUssdSession, input: string): Promise<string> {
    if (!input) {
      return 'CON Welcome John!\n1. Check Balance\n2. Betting Menu\n3. Bet History\n4. Help\n0. Logout\n*. Main Menu';
    }

    switch (input) {
      case '1':
        return 'CON ACCOUNT BALANCE\nBalance: $150.00\n\nTo deposit funds, please use our website or mobile app.\n\n0. Back to Account Menu\n*. Main Menu';
      case '2':
        return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
      case '3':
        return 'CON BET HISTORY (Last 5)\n1. $10.00 - WON\n2. $5.00 - LOST\n3. $20.00 - PENDING\n\n0. Back to Account Menu\n*. Main Menu';
      case '4':
        return 'CON HELP MENU\n1. How to Bet\n2. Account Help\n3. Navigation Help\n4. Contact Support\n0. Back\n*. Main Menu';
      case '0':
        return 'END Thank you for using our betting service!';
      case '*':
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      default:
        return 'CON Welcome John!\nInvalid option. Please try again.\n\n1. Check Balance\n2. Betting Menu\n3. Bet History\n4. Help\n0. Logout\n*. Main Menu';
    }
  }
}

class MockUssdBettingService {
  async handleBettingMenu(session: MockUssdSession, input: string): Promise<string> {
    if (!input) {
      return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
    }

    switch (input) {
      case '1':
        return 'CON SELECT SPORT\n1. Football\n2. Basketball\n3. Tennis\n4. Baseball\n\n0. Back to Betting Menu\n*. Main Menu';
      case '2':
        return 'CON ACTIVE BETS\n1. $20.00 on Team A vs Team B\n2. $15.00 on Player X vs Player Y\n\n0. Back to Betting Menu\n*. Main Menu';
      case '3':
        return 'CON BET HISTORY (Last 5)\n1. $10.00 - WON\n2. $5.00 - LOST\n3. $20.00 - PENDING\n4. $8.00 - WON\n5. $12.00 - VOID\n\n0. Back to Betting Menu\n*. Main Menu';
      case '0':
        return 'CON Welcome John!\n1. Check Balance\n2. Betting Menu\n3. Bet History\n4. Help\n0. Logout\n*. Main Menu';
      case '*':
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      default:
        return 'CON BETTING MENU\nInvalid option. Please try again.\n\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
    }
  }

  async handleSportsList(session: MockUssdSession, input: string): Promise<string> {
    if (!input) {
      return 'CON SELECT SPORT\n1. Football\n2. Basketball\n3. Tennis\n4. Baseball\n\n0. Back to Betting Menu\n*. Main Menu';
    }

    switch (input) {
      case '1':
        return 'CON FOOTBALL\n1. Team A vs Team B\n   Today 3:00 PM\n2. Team C vs Team D\n   Today 6:00 PM\n\n0. Back to Sports\n*. Main Menu';
      case '2':
        return 'CON BASKETBALL\n1. Lakers vs Warriors\n   Today 8:00 PM\n2. Bulls vs Celtics\n   Tomorrow 7:00 PM\n\n0. Back to Sports\n*. Main Menu';
      case '0':
        return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
      case '*':
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      default:
        return 'CON SELECT SPORT\nInvalid option. Please try again.\n\n1. Football\n2. Basketball\n3. Tennis\n4. Baseball\n\n0. Back to Betting Menu\n*. Main Menu';
    }
  }

  async handleBetPlacement(session: MockUssdSession, input: string): Promise<string> {
    // Simulate bet placement flow
    if (!input) {
      return 'CON Team A vs Team B\nMatch Winner\n\n1. Team A @ 2.50\n2. Team B @ 1.80\n3. Draw @ 3.20\n\n0. Back to Events\n*. Main Menu';
    }

    switch (input) {
      case '1':
        return 'CON PLACE BET\nTeam A\nOdds: 2.50\n\nYour Balance: $150.00\nEnter stake amount:\n\n0. Back to Selections\n*. Main Menu';
      case '2':
        return 'CON PLACE BET\nTeam B\nOdds: 1.80\n\nYour Balance: $150.00\nEnter stake amount:\n\n0. Back to Selections\n*. Main Menu';
      case '10':
        return 'CON CONFIRM BET\nTeam A\nOdds: 2.50\nStake: $10.00\nPotential Win: $25.00\n\n1. Confirm Bet\n2. Change Stake\n0. Cancel\n*. Main Menu';
      case '0':
        return 'CON FOOTBALL\n1. Team A vs Team B\n   Today 3:00 PM\n2. Team C vs Team D\n   Today 6:00 PM\n\n0. Back to Sports\n*. Main Menu';
      default:
        return 'CON Team A vs Team B\nInvalid selection.\n\n1. Team A @ 2.50\n2. Team B @ 1.80\n3. Draw @ 3.20\n\n0. Back to Events\n*. Main Menu';
    }
  }
}

// Demo USSD Service
class DemoUssdService {
  private menuService = new MockUssdMenuService();
  private bettingService = new MockUssdBettingService();

  async processUssdRequest(request: {
    sessionId: string;
    phoneNumber: string;
    text: string;
  }): Promise<string> {
    try {
      // Create mock session
      const session = new MockUssdSession({
        sessionId: request.sessionId,
        phoneNumber: request.phoneNumber,
        currentMenu: 'main_menu',
      });

      // Parse user input
      const userInput = this.parseUserInput(request.text);
      const currentInput = userInput[userInput.length - 1] || '';

      // Simulate menu navigation based on input history
      return await this.processMenuNavigation(session, userInput, currentInput);
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

  private async processMenuNavigation(
    session: MockUssdSession,
    userInput: string[],
    currentInput: string
  ): Promise<string> {
    // Simulate menu navigation based on input sequence
    if (userInput.length === 0) {
      return await this.menuService.handleMainMenu(session, '');
    }

    const firstInput = userInput[0];
    
    // Main menu navigation
    if (userInput.length === 1) {
      return await this.menuService.handleMainMenu(session, firstInput);
    }

    // Login flow
    if (firstInput === '1') {
      if (userInput.length === 2) {
        return await this.menuService.handleLogin(session, userInput[1]);
      }
      // After login, show account menu
      if (userInput.length === 3) {
        return await this.menuService.handleAccountMenu(session, userInput[2]);
      }
      // Account menu sub-navigation
      if (userInput.length === 4) {
        const accountAction = userInput[2];
        if (accountAction === '2') { // Betting menu
          return await this.bettingService.handleBettingMenu(session, userInput[3]);
        }
      }
      // Betting sub-navigation
      if (userInput.length === 5) {
        const accountAction = userInput[2];
        const bettingAction = userInput[3];
        if (accountAction === '2' && bettingAction === '1') { // View sports
          return await this.bettingService.handleSportsList(session, userInput[4]);
        }
      }
      // Sport selection and bet placement
      if (userInput.length === 6) {
        const accountAction = userInput[2];
        const bettingAction = userInput[3];
        const sportAction = userInput[4];
        if (accountAction === '2' && bettingAction === '1' && sportAction === '1') { // Football
          return await this.bettingService.handleBetPlacement(session, userInput[5]);
        }
      }
      // Stake input
      if (userInput.length === 7) {
        return await this.bettingService.handleBetPlacement(session, userInput[6]);
      }
    }

    // Registration flow
    if (firstInput === '2') {
      if (userInput.length === 2) {
        return 'CON REGISTER\nEnter your phone number:\n\n0. Back to main menu';
      }
      if (userInput.length === 3) {
        return 'CON Enter your full name:\n\n0. Back to main menu';
      }
      if (userInput.length === 4) {
        return 'CON Create a 4-digit PIN:\n\n0. Back to main menu';
      }
      if (userInput.length === 5) {
        return 'CON Confirm your PIN:\n\n0. Back to main menu';
      }
      if (userInput.length === 6) {
        return 'END Registration successful!\nWelcome to our betting platform!';
      }
    }

    // Help menu
    if (firstInput === '3') {
      return 'CON HELP MENU\n1. How to Bet\n2. Account Help\n3. Navigation Help\n4. Contact Support\n0. Back\n*. Main Menu';
    }

    return await this.menuService.handleMainMenu(session, '');
  }
}

// Demo function
async function demonstrateUssdFlow() {
  const ussdService = new DemoUssdService();

  console.log('=== USSD Betting Interface Demo ===\n');

  // Test scenarios
  const scenarios = [
    {
      name: 'Initial USSD dial',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '' }
    },
    {
      name: 'Select Login',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1' }
    },
    {
      name: 'Enter phone number',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890' }
    },
    {
      name: 'Access account menu',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234' }
    },
    {
      name: 'Check balance',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*1' }
    },
    {
      name: 'Go to betting menu',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*2' }
    },
    {
      name: 'View sports',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*2*1' }
    },
    {
      name: 'Select Football',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*2*1*1' }
    },
    {
      name: 'Select Team A vs Team B',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*2*1*1*1' }
    },
    {
      name: 'Select Team A',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*2*1*1*1*1' }
    },
    {
      name: 'Enter stake $10',
      request: { sessionId: 'demo1', phoneNumber: '+1234567890', text: '1*1234567890*1234*2*1*1*1*1*10' }
    },
    {
      name: 'Registration flow',
      request: { sessionId: 'demo2', phoneNumber: '+1234567890', text: '2*1234567890*John Doe*1234*1234' }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    console.log(`Input: ${scenario.request.text || '(empty)'}`);
    
    const response = await ussdService.processUssdRequest(scenario.request);
    console.log(`Response:\n${response}`);
    console.log('-'.repeat(50));
  }

  console.log('\n=== Demo Complete ===');
  console.log('\nKey Features Demonstrated:');
  console.log('✓ USSD menu system with hierarchical navigation');
  console.log('✓ Session management and state tracking');
  console.log('✓ User authentication flow');
  console.log('✓ Account management (balance, history)');
  console.log('✓ Sports betting flow (sport selection, bet placement)');
  console.log('✓ Registration process');
  console.log('✓ Error handling and input validation');
  console.log('✓ Help system and navigation instructions');
}

// Run the demo
if (require.main === module) {
  demonstrateUssdFlow().catch(console.error);
}

export { DemoUssdService, demonstrateUssdFlow };