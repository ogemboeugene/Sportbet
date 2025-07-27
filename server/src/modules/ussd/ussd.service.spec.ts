import { Test, TestingModule } from '@nestjs/testing';
import { UssdService } from './ussd.service';
import { UssdSessionService } from './services/ussd-session.service';
import { UssdMenuService } from './services/ussd-menu.service';
import { UssdBettingService } from './services/ussd-betting.service';
import { ConfigService } from '@nestjs/config';

describe('UssdService', () => {
  let service: UssdService;
  let sessionService: jest.Mocked<UssdSessionService>;
  let menuService: jest.Mocked<UssdMenuService>;
  let bettingService: jest.Mocked<UssdBettingService>;

  beforeEach(async () => {
    const mockSessionService = {
      getSession: jest.fn(),
      createSession: jest.fn(),
      updateLastActivity: jest.fn(),
    };

    const mockMenuService = {
      handleMainMenu: jest.fn(),
      handleLogin: jest.fn(),
      handleAccountMenu: jest.fn(),
    };

    const mockBettingService = {
      handleBettingMenu: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UssdService,
        { provide: UssdSessionService, useValue: mockSessionService },
        { provide: UssdMenuService, useValue: mockMenuService },
        { provide: UssdBettingService, useValue: mockBettingService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UssdService>(UssdService);
    sessionService = module.get(UssdSessionService);
    menuService = module.get(UssdMenuService);
    bettingService = module.get(UssdBettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processUssdRequest', () => {
    it('should create new session for first-time user', async () => {
      const request = {
        sessionId: 'test-session',
        serviceCode: '*123#',
        phoneNumber: '+1234567890',
        text: '',
      };

      sessionService.getSession.mockResolvedValue(null);
      sessionService.createSession.mockResolvedValue({
        sessionId: 'test-session',
        phoneNumber: '+1234567890',
        currentMenu: 'main_menu',
        sessionData: {},
        menuHistory: [],
        isActive: true,
      } as any);
      
      menuService.handleMainMenu.mockResolvedValue('CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit');

      const result = await service.processUssdRequest(request);

      expect(sessionService.createSession).toHaveBeenCalled();
      expect(menuService.handleMainMenu).toHaveBeenCalled();
      expect(result).toContain('WELCOME TO BETTING PLATFORM');
    });

    it('should handle existing session', async () => {
      const request = {
        sessionId: 'existing-session',
        serviceCode: '*123#',
        phoneNumber: '+1234567890',
        text: '1',
      };

      const existingSession = {
        sessionId: 'existing-session',
        phoneNumber: '+1234567890',
        currentMenu: 'main_menu',
        sessionData: {},
        menuHistory: [],
        isActive: true,
      };

      sessionService.getSession.mockResolvedValue(existingSession as any);
      menuService.handleMainMenu.mockResolvedValue('CON LOGIN\nEnter your phone number:\n\n0. Back to main menu');

      const result = await service.processUssdRequest(request);

      expect(sessionService.updateLastActivity).toHaveBeenCalledWith('existing-session');
      expect(menuService.handleMainMenu).toHaveBeenCalledWith(existingSession, '1');
      expect(result).toContain('LOGIN');
    });

    it('should handle errors gracefully', async () => {
      const request = {
        sessionId: 'error-session',
        serviceCode: '*123#',
        phoneNumber: '+1234567890',
        text: '',
      };

      sessionService.getSession.mockRejectedValue(new Error('Database error'));

      const result = await service.processUssdRequest(request);

      expect(result).toBe('END An error occurred. Please try again later.');
    });
  });

  describe('parseUserInput', () => {
    it('should parse empty input correctly', () => {
      const result = (service as any).parseUserInput('');
      expect(result).toEqual([]);
    });

    it('should parse single input correctly', () => {
      const result = (service as any).parseUserInput('1');
      expect(result).toEqual(['1']);
    });

    it('should parse multiple inputs correctly', () => {
      const result = (service as any).parseUserInput('1*2*3');
      expect(result).toEqual(['1', '2', '3']);
    });
  });
});