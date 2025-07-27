import { Test, TestingModule } from '@nestjs/testing';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';

describe('UssdController', () => {
  let controller: UssdController;
  let service: jest.Mocked<UssdService>;

  beforeEach(async () => {
    const mockService = {
      processUssdRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UssdController],
      providers: [
        { provide: UssdService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<UssdController>(UssdController);
    service = module.get(UssdService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleUssdCallback', () => {
    it('should process USSD request and return response', async () => {
      const request = {
        sessionId: 'test-session',
        serviceCode: '*123#',
        phoneNumber: '+1234567890',
        text: '',
      };

      const expectedResponse = 'CON WELCOME TO BETTING PLATFORM\n1. Login\n2. Register\n3. Help\n0. Exit';
      service.processUssdRequest.mockResolvedValue(expectedResponse);

      const result = await controller.handleUssdCallback(request);

      expect(service.processUssdRequest).toHaveBeenCalledWith(request);
      expect(result).toBe(expectedResponse);
    });

    it('should handle errors gracefully', async () => {
      const request = {
        sessionId: 'error-session',
        serviceCode: '*123#',
        phoneNumber: '+1234567890',
        text: '',
      };

      service.processUssdRequest.mockRejectedValue(new Error('Service error'));

      const result = await controller.handleUssdCallback(request);

      expect(result).toBe('END An error occurred. Please try again later.');
    });
  });

  describe('testUssd', () => {
    it('should handle test requests', async () => {
      const testData = {
        phoneNumber: '+1234567890',
        text: '1',
      };

      const expectedResponse = 'CON LOGIN\nEnter your phone number:\n\n0. Back to main menu';
      service.processUssdRequest.mockResolvedValue(expectedResponse);

      const result = await controller.testUssd(testData);

      expect(result.response).toBe(expectedResponse);
      expect(result.phoneNumber).toBe(testData.phoneNumber);
      expect(result.sessionId).toMatch(/^test_\d+$/);
    });
  });
});