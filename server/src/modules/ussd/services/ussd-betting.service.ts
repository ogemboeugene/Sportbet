import { Injectable } from '@nestjs/common';
import { UssdSessionService } from './ussd-session.service';
import { OddsService } from '../../odds/services/odds.service';
import { BettingService } from '../../betting/services/betting.service';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class UssdBettingService {
  constructor(
    private readonly sessionService: UssdSessionService,
    private readonly oddsService: OddsService,
    private readonly bettingService: BettingService,
    private readonly walletService: WalletService,
  ) {}

  async handleBettingMenu(session: any, input: string): Promise<string> {
    if (!input) {
      return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
    }

    switch (input) {
      case '1':
        await this.sessionService.navigateToMenu(session.sessionId, 'sports_list');
        return await this.handleSportsList(session, '');
      
      case '2':
        return await this.handleActiveBets(session);
      
      case '3':
        await this.sessionService.navigateToMenu(session.sessionId, 'bet_history');
        return await this.handleBetHistory(session);
      
      case '0':
        await this.sessionService.navigateToMenu(session.sessionId, 'account_menu');
        return 'CON ACCOUNT MENU\n1. Check Balance\n2. Betting Menu\n3. Bet History\n4. Help\n0. Logout\n*. Main Menu';
      
      case '*':
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      
      default:
        return 'CON BETTING MENU\nInvalid option. Please try again.\n\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
    }
  }

  async handleSportsList(session: any, input: string): Promise<string> {
    try {
      if (!input) {
        // Display available sports
        const sports = await this.oddsService.getAvailableSports();
        
        if (!sports || sports.length === 0) {
          return 'CON No sports available at the moment.\n\n0. Back to Betting Menu\n*. Main Menu';
        }

        let response = 'CON SELECT SPORT\n';
        sports.slice(0, 8).forEach((sport, index) => { // Limit to 8 sports for USSD
          response += `${index + 1}. ${sport.title}\n`;
        });
        response += '\n0. Back to Betting Menu\n*. Main Menu';
        
        // Store sports list in session for reference
        await this.sessionService.setSessionData(session.sessionId, 'sportsList', sports.slice(0, 8));
        
        return response;
      }

      const sportIndex = parseInt(input) - 1;
      const sportsList = await this.sessionService.getSessionData(session.sessionId, 'sportsList');
      
      if (input === '0') {
        await this.sessionService.navigateToMenu(session.sessionId, 'betting_menu');
        return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
      }

      if (input === '*') {
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      }

      if (sportIndex >= 0 && sportIndex < sportsList.length) {
        const selectedSport = sportsList[sportIndex];
        await this.sessionService.setSessionData(session.sessionId, 'selectedSport', selectedSport);
        await this.sessionService.navigateToMenu(session.sessionId, 'events_list');
        return await this.handleEventsList(session, '');
      }

      return 'CON SELECT SPORT\nInvalid option. Please try again.\n\n' + 
             sportsList.map((sport, index) => `${index + 1}. ${sport.title}`).join('\n') +
             '\n\n0. Back to Betting Menu\n*. Main Menu';
    } catch (error) {
      console.error('Sports list error:', error);
      return 'CON Unable to load sports.\nPlease try again later.\n\n0. Back to Betting Menu\n*. Main Menu';
    }
  }

  async handleEventsList(session: any, input: string): Promise<string> {
    try {
      const selectedSport = await this.sessionService.getSessionData(session.sessionId, 'selectedSport');
      
      if (!selectedSport) {
        await this.sessionService.navigateToMenu(session.sessionId, 'sports_list');
        return await this.handleSportsList(session, '');
      }

      if (!input) {
        // Display events for selected sport
        const events = await this.oddsService.getEventsBySport(selectedSport.key);
        
        if (!events || events.length === 0) {
          return `CON ${selectedSport.title.toUpperCase()}\nNo events available.\n\n0. Back to Sports\n*. Main Menu`;
        }

        let response = `CON ${selectedSport.title.toUpperCase()}\n`;
        const limitedEvents = events.slice(0, 6); // Limit to 6 events for USSD
        
        limitedEvents.forEach((event, index) => {
          const startTime = new Date(event.startTime).toLocaleDateString();
          response += `${index + 1}. ${event.homeTeam} vs ${event.awayTeam}\n   ${startTime}\n`;
        });
        
        response += '\n0. Back to Sports\n*. Main Menu';
        
        // Store events list in session
        await this.sessionService.setSessionData(session.sessionId, 'eventsList', limitedEvents);
        
        return response;
      }

      const eventIndex = parseInt(input) - 1;
      const eventsList = await this.sessionService.getSessionData(session.sessionId, 'eventsList');
      
      if (input === '0') {
        await this.sessionService.navigateToMenu(session.sessionId, 'sports_list');
        return await this.handleSportsList(session, '');
      }

      if (input === '*') {
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      }

      if (eventIndex >= 0 && eventIndex < eventsList.length) {
        const selectedEvent = eventsList[eventIndex];
        await this.sessionService.setSessionData(session.sessionId, 'selectedEvent', selectedEvent);
        await this.sessionService.navigateToMenu(session.sessionId, 'bet_placement');
        return await this.handleBetPlacement(session, '', []);
      }

      return `CON ${selectedSport.title.toUpperCase()}\nInvalid option. Please try again.\n\n` +
             eventsList.map((event, index) => 
               `${index + 1}. ${event.homeTeam} vs ${event.awayTeam}`
             ).join('\n') +
             '\n\n0. Back to Sports\n*. Main Menu';
    } catch (error) {
      console.error('Events list error:', error);
      return 'CON Unable to load events.\nPlease try again later.\n\n0. Back to Sports\n*. Main Menu';
    }
  }

  async handleBetPlacement(session: any, input: string, fullInput: string[]): Promise<string> {
    try {
      const selectedEvent = await this.sessionService.getSessionData(session.sessionId, 'selectedEvent');
      const betStep = await this.sessionService.getSessionData(session.sessionId, 'betStep') || 'market';
      
      if (!selectedEvent) {
        await this.sessionService.navigateToMenu(session.sessionId, 'sports_list');
        return await this.handleSportsList(session, '');
      }

      if (input === '0') {
        await this.sessionService.navigateToMenu(session.sessionId, 'events_list');
        return await this.handleEventsList(session, '');
      }

      if (input === '*') {
        await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
        return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      }

      switch (betStep) {
        case 'market':
          return await this.handleMarketSelection(session, input, selectedEvent);
        
        case 'selection':
          return await this.handleSelectionChoice(session, input, selectedEvent);
        
        case 'stake':
          return await this.handleStakeInput(session, input);
        
        case 'confirm':
          return await this.handleBetConfirmation(session, input);
        
        default:
          await this.sessionService.setSessionData(session.sessionId, 'betStep', 'market');
          return await this.handleMarketSelection(session, '', selectedEvent);
      }
    } catch (error) {
      console.error('Bet placement error:', error);
      return 'CON Betting error occurred.\nPlease try again later.\n\n0. Back to Events\n*. Main Menu';
    }
  }

  private async handleMarketSelection(session: any, input: string, event: any): Promise<string> {
    if (!input) {
      // Show available markets (simplified for USSD)
      const markets = event.markets || [];
      const mainMarkets = markets.filter(m => 
        m.marketName.includes('Match Winner') || 
        m.marketName.includes('1X2') ||
        m.marketName.includes('Moneyline')
      ).slice(0, 3);

      if (mainMarkets.length === 0) {
        return 'CON No betting markets available for this event.\n\n0. Back to Events\n*. Main Menu';
      }

      let response = `CON ${event.homeTeam} vs ${event.awayTeam}\nSELECT MARKET:\n`;
      mainMarkets.forEach((market, index) => {
        response += `${index + 1}. ${market.marketName}\n`;
      });
      response += '\n0. Back to Events\n*. Main Menu';

      await this.sessionService.setSessionData(session.sessionId, 'availableMarkets', mainMarkets);
      return response;
    }

    const marketIndex = parseInt(input) - 1;
    const availableMarkets = await this.sessionService.getSessionData(session.sessionId, 'availableMarkets');
    
    if (marketIndex >= 0 && marketIndex < availableMarkets.length) {
      const selectedMarket = availableMarkets[marketIndex];
      await this.sessionService.setSessionData(session.sessionId, 'selectedMarket', selectedMarket);
      await this.sessionService.setSessionData(session.sessionId, 'betStep', 'selection');
      return await this.handleSelectionChoice(session, '', event);
    }

    return `CON ${event.homeTeam} vs ${event.awayTeam}\nInvalid market selection.\n\n` +
           availableMarkets.map((market, index) => `${index + 1}. ${market.marketName}`).join('\n') +
           '\n\n0. Back to Events\n*. Main Menu';
  }

  private async handleSelectionChoice(session: any, input: string, event: any): Promise<string> {
    const selectedMarket = await this.sessionService.getSessionData(session.sessionId, 'selectedMarket');
    
    if (!input) {
      const selections = selectedMarket.selections || [];
      
      if (selections.length === 0) {
        return 'CON No betting options available.\n\n0. Back to Events\n*. Main Menu';
      }

      let response = `CON ${event.homeTeam} vs ${event.awayTeam}\n${selectedMarket.marketName}\n\n`;
      selections.forEach((selection, index) => {
        response += `${index + 1}. ${selection.selectionName} @ ${selection.odds}\n`;
      });
      response += '\n0. Back to Markets\n*. Main Menu';

      return response;
    }

    const selectionIndex = parseInt(input) - 1;
    const selections = selectedMarket.selections || [];
    
    if (selectionIndex >= 0 && selectionIndex < selections.length) {
      const selectedSelection = selections[selectionIndex];
      await this.sessionService.setSessionData(session.sessionId, 'selectedSelection', selectedSelection);
      await this.sessionService.setSessionData(session.sessionId, 'betStep', 'stake');
      return await this.handleStakeInput(session, '');
    }

    return `CON ${event.homeTeam} vs ${event.awayTeam}\nInvalid selection.\n\n` +
           selections.map((selection, index) => 
             `${index + 1}. ${selection.selectionName} @ ${selection.odds}`
           ).join('\n') +
           '\n\n0. Back to Markets\n*. Main Menu';
  }

  private async handleStakeInput(session: any, input: string): Promise<string> {
    const selectedSelection = await this.sessionService.getSessionData(session.sessionId, 'selectedSelection');
    const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
    
    if (!input) {
      // Check user balance
      const wallet = await this.walletService.getWallet(userId);
      const balance = wallet?.balance || 0;
      
      return `CON PLACE BET\n${selectedSelection.selectionName}\nOdds: ${selectedSelection.odds}\n\nYour Balance: $${balance.toFixed(2)}\nEnter stake amount:\n\n0. Back to Selections\n*. Main Menu`;
    }

    const stake = parseFloat(input);
    
    if (isNaN(stake) || stake <= 0) {
      return 'CON Invalid stake amount.\nEnter a valid amount:\n\n0. Back to Selections\n*. Main Menu';
    }

    if (stake < 1) {
      return 'CON Minimum stake is $1.00.\nEnter stake amount:\n\n0. Back to Selections\n*. Main Menu';
    }

    // Check if user has sufficient balance
    const wallet = await this.walletService.getWallet(userId);
    const balance = wallet?.balance || 0;
    
    if (stake > balance) {
      return `CON Insufficient balance.\nYour Balance: $${balance.toFixed(2)}\nEnter stake amount:\n\n0. Back to Selections\n*. Main Menu`;
    }

    const potentialWin = stake * selectedSelection.odds;
    
    await this.sessionService.setSessionData(session.sessionId, 'betStake', stake);
    await this.sessionService.setSessionData(session.sessionId, 'potentialWin', potentialWin);
    await this.sessionService.setSessionData(session.sessionId, 'betStep', 'confirm');
    
    return `CON CONFIRM BET\n${selectedSelection.selectionName}\nOdds: ${selectedSelection.odds}\nStake: $${stake.toFixed(2)}\nPotential Win: $${potentialWin.toFixed(2)}\n\n1. Confirm Bet\n2. Change Stake\n0. Cancel\n*. Main Menu`;
  }

  private async handleBetConfirmation(session: any, input: string): Promise<string> {
    if (input === '1') {
      // Confirm and place bet
      try {
        const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
        const selectedEvent = await this.sessionService.getSessionData(session.sessionId, 'selectedEvent');
        const selectedMarket = await this.sessionService.getSessionData(session.sessionId, 'selectedMarket');
        const selectedSelection = await this.sessionService.getSessionData(session.sessionId, 'selectedSelection');
        const stake = await this.sessionService.getSessionData(session.sessionId, 'betStake');
        const potentialWin = await this.sessionService.getSessionData(session.sessionId, 'potentialWin');

        const betData = {
          selections: [{
            eventId: selectedEvent.eventId,
            marketId: selectedMarket.marketId,
            selectionId: selectedSelection.selectionId,
            odds: selectedSelection.odds,
            eventName: `${selectedEvent.homeTeam} vs ${selectedEvent.awayTeam}`,
            marketName: selectedMarket.marketName,
            selectionName: selectedSelection.selectionName,
            startTime: selectedEvent.startTime,
            status: 'pending' as const,
          }],
          stake,
          currency: 'USD',
        };

        const bet = await this.bettingService.placeBet(userId, betData);
        
        if (bet) {
          // Clear bet session data
          await this.sessionService.setSessionData(session.sessionId, 'betStep', null);
          await this.sessionService.setSessionData(session.sessionId, 'selectedEvent', null);
          await this.sessionService.setSessionData(session.sessionId, 'selectedMarket', null);
          await this.sessionService.setSessionData(session.sessionId, 'selectedSelection', null);
          
          return `END BET PLACED SUCCESSFULLY!\nBet ID: ${bet.reference}\nStake: $${stake.toFixed(2)}\nPotential Win: $${potentialWin.toFixed(2)}\n\nGood luck!`;
        } else {
          return 'END Bet placement failed.\nPlease try again later.';
        }
      } catch (error) {
        console.error('Bet confirmation error:', error);
        return 'END Bet placement failed.\nPlease try again later.';
      }
    } else if (input === '2') {
      // Change stake
      await this.sessionService.setSessionData(session.sessionId, 'betStep', 'stake');
      return await this.handleStakeInput(session, '');
    } else if (input === '0') {
      // Cancel bet
      await this.sessionService.setSessionData(session.sessionId, 'betStep', null);
      await this.sessionService.navigateToMenu(session.sessionId, 'betting_menu');
      return 'CON BETTING MENU\n1. View Sports\n2. My Active Bets\n3. Bet History\n\n0. Back to Account\n*. Main Menu';
    } else if (input === '*') {
      await this.sessionService.navigateToMenu(session.sessionId, 'main_menu');
      return 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
    }

    const selectedSelection = await this.sessionService.getSessionData(session.sessionId, 'selectedSelection');
    const stake = await this.sessionService.getSessionData(session.sessionId, 'betStake');
    const potentialWin = await this.sessionService.getSessionData(session.sessionId, 'potentialWin');
    
    return `CON CONFIRM BET\nInvalid option.\n\n${selectedSelection.selectionName}\nOdds: ${selectedSelection.odds}\nStake: $${stake.toFixed(2)}\nPotential Win: $${potentialWin.toFixed(2)}\n\n1. Confirm Bet\n2. Change Stake\n0. Cancel\n*. Main Menu`;
  }

  private async handleActiveBets(session: any): Promise<string> {
    try {
      const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
      const activeBets = await this.bettingService.getUserBets(userId, { 
        status: 'pending',
        limit: 5 
      });
      
      if (!activeBets || activeBets.length === 0) {
        return 'CON ACTIVE BETS\nNo active bets found.\n\n0. Back to Betting Menu\n*. Main Menu';
      }

      let response = 'CON ACTIVE BETS\n';
      activeBets.forEach((bet, index) => {
        const selection = bet.selections[0];
        response += `${index + 1}. $${bet.stake.toFixed(2)} on ${selection.selectionName}\n`;
      });
      
      response += '\n0. Back to Betting Menu\n*. Main Menu';
      return response;
    } catch (error) {
      console.error('Active bets error:', error);
      return 'CON Unable to load active bets.\nPlease try again later.\n\n0. Back to Betting Menu\n*. Main Menu';
    }
  }

  private async handleBetHistory(session: any): Promise<string> {
    try {
      const userId = await this.sessionService.getSessionData(session.sessionId, 'userId');
      const betHistory = await this.bettingService.getUserBets(userId, { limit: 5 });
      
      if (!betHistory || betHistory.length === 0) {
        return 'CON BET HISTORY\nNo bets found.\n\n0. Back to Betting Menu\n*. Main Menu';
      }

      let response = 'CON BET HISTORY (Last 5)\n';
      betHistory.forEach((bet, index) => {
        const status = bet.status.toUpperCase();
        response += `${index + 1}. $${bet.stake.toFixed(2)} - ${status}\n`;
      });
      
      response += '\n0. Back to Betting Menu\n*. Main Menu';
      return response;
    } catch (error) {
      console.error('Bet history error:', error);
      return 'CON Unable to load bet history.\nPlease try again later.\n\n0. Back to Betting Menu\n*. Main Menu';
    }
  }
}