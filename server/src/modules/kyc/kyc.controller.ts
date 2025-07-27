import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Headers,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../auth/guards/admin-jwt-auth.guard'
import { AdminRoleGuard } from '../auth/guards/admin-role.guard'
import { AdminPermissions } from '../auth/decorators/admin.decorators'
import { AdminPermission } from '../../database/schemas/admin-user.schema'
import { KycService } from './kyc.service'

@Controller('kyc')
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  async initiateKyc(@Request() req) {
    const result = await this.kycService.initiateKyc(req.user.sub)
    return {
      success: true,
      data: result,
      message: 'KYC process initiated',
    }
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Request() req,
    @Body('documentType') documentType: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      }
    }

    const result = await this.kycService.uploadDocument(req.user.sub, documentType, file)
    return {
      success: true,
      data: result,
      message: 'Document uploaded successfully',
    }
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submitForReview(@Request() req) {
    const result = await this.kycService.submitForReview(req.user.sub)
    return {
      success: true,
      data: result,
      message: 'KYC submitted for review',
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getKycStatus(@Request() req) {
    const result = await this.kycService.getKycStatus(req.user.sub)
    return {
      success: true,
      data: result,
      message: 'KYC status retrieved',
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any, @Headers('x-signature') signature: string) {
    const result = await this.kycService.handleWebhook(payload, signature)
    return {
      success: true,
      message: result.message,
    }
  }

  // Admin endpoints
  @Get('admin/submissions')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard) 
  @AdminPermissions(AdminPermission.VIEW_KYC_SUBMISSIONS)
  async getAllSubmissions(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: string,
  ) {
    const result = await this.kycService.getAllKycSubmissions(page, limit, status)
    return {
      success: true,
      data: result,
      message: 'KYC submissions retrieved',
    }
  }

  @Put('admin/review/:documentId')
  @UseGuards(AdminJwtAuthGuard, AdminRoleGuard)
  @AdminPermissions(AdminPermission.APPROVE_KYC, AdminPermission.REJECT_KYC)
  async reviewDocument(
    @Param('documentId') documentId: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
    @Request() req,
  ) {
    const result = await this.kycService.reviewKycDocument(
      documentId,
      body.action,
      body.reason,
      req.user.sub,
    )
    return {
      success: true,
      data: result,
      message: `Document ${body.action}ed successfully`,
    }
  }
}