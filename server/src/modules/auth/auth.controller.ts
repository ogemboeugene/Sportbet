import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  Get,
  HttpCode,
  HttpStatus 
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { Setup2FADto, Verify2FADto, Disable2FADto } from './dto/setup-2fa.dto'

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto)
    return {
      success: true,
      data: result,
      message: 'Account created successfully'
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Request() req) {
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')
    
    const result = await this.authService.login(loginDto, ipAddress, userAgent)
    
    if ((result as any).requiresTwoFactor) {
      return {
        success: true,
        data: result,
        message: (result as any).message
      }
    }

    return {
      success: true,
      data: result,
      message: 'Login successful'
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken)
    return {
      success: true,
      data: result,
      message: 'Token refreshed successfully'
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    const result = await this.authService.requestPasswordReset(email)
    return {
      success: true,
      message: result.message
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password
    )
    return {
      success: true,
      message: result.message
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    const result = await this.authService.verifyEmail(token)
    return {
      success: true,
      message: result.message
    }
  }

  @Post('resend-verification')
  @UseGuards(JwtAuthGuard)
  async resendVerification(@Request() req) {
    const result = await this.authService.sendEmailVerification(req.user.sub)
    return {
      success: true,
      message: result.message
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      success: true,
      data: req.user,
      message: 'Profile retrieved successfully'
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    // In a production app, you might want to blacklist the token
    return {
      success: true,
      message: 'Logged out successfully'
    }
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Body() body: { tempToken: string; token: string }) {
    const result = await this.authService.verifyTwoFactor(body.tempToken, body.token)
    return {
      success: true,
      data: result,
      message: 'Two-factor authentication successful'
    }
  }

  @Post('setup-2fa')
  @UseGuards(JwtAuthGuard)
  async setup2FA(@Request() req) {
    const result = await this.authService.setup2FA(req.user.sub)
    return {
      success: true,
      data: result,
      message: 'Two-factor authentication setup initiated'
    }
  }

  @Post('enable-2fa')
  @UseGuards(JwtAuthGuard)
  async enable2FA(@Request() req, @Body() setup2FADto: Setup2FADto) {
    const result = await this.authService.enable2FA(req.user.sub, setup2FADto.token)
    return {
      success: true,
      message: result.message
    }
  }

  @Post('disable-2fa')
  @UseGuards(JwtAuthGuard)
  async disable2FA(@Request() req, @Body() disable2FADto: Disable2FADto) {
    const result = await this.authService.disable2FA(req.user.sub, disable2FADto.token)
    return {
      success: true,
      message: result.message
    }
  }

  @Post('regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  async regenerateBackupCodes(@Request() req, @Body() body: { token: string }) {
    const result = await this.authService.regenerateBackupCodes(req.user.sub, body.token)
    return {
      success: true,
      data: result,
      message: 'Backup codes regenerated successfully'
    }
  }

  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  async getLoginHistory(@Request() req) {
    const result = await this.authService.getLoginHistory(req.user.sub)
    return {
      success: true,
      data: result,
      message: 'Login history retrieved successfully'
    }
  }

  @Get('security-analysis')
  @UseGuards(JwtAuthGuard)
  async getSecurityAnalysis(@Request() req) {
    const result = await this.authService.getSecurityAnalysis(req.user.sub)
    return {
      success: true,
      data: result,
      message: 'Security analysis completed'
    }
  }
}