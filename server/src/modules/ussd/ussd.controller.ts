import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UssdService } from './ussd.service';
import { UssdRequestDto } from './dto/ussd-request.dto';

@Controller('ussd')
export class UssdController {
  constructor(private readonly ussdService: UssdService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleUssdCallback(@Body() ussdRequest: UssdRequestDto): Promise<string> {
    try {
      const response = await this.ussdService.processUssdRequest(ussdRequest);
      return response;
    } catch (error) {
      console.error('USSD callback error:', error);
      return 'END An error occurred. Please try again later.';
    }
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testUssd(@Body() testData: { phoneNumber: string; text?: string }): Promise<any> {
    // Test endpoint for development
    const ussdRequest: UssdRequestDto = {
      sessionId: `test_${Date.now()}`,
      serviceCode: '*123#',
      phoneNumber: testData.phoneNumber,
      text: testData.text || '',
      networkCode: '63902',
    };

    const response = await this.ussdService.processUssdRequest(ussdRequest);
    return {
      response,
      sessionId: ussdRequest.sessionId,
      phoneNumber: ussdRequest.phoneNumber,
    };
  }
}