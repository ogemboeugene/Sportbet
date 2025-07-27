import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
import * as crypto from 'crypto'
import * as FormData from 'form-data'

@Injectable()
export class SumsubService {
  private readonly apiClient: AxiosInstance
  private readonly apiKey: string
  private readonly secretKey: string
  private readonly baseUrl: string

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SUMSUB_API_KEY')
    this.secretKey = this.configService.get<string>('SUMSUB_SECRET_KEY')
    this.baseUrl = this.configService.get<string>('SUMSUB_BASE_URL', 'https://api.sumsub.com')

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    })

    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use((config) => {
      const timestamp = Math.floor(Date.now() / 1000)
      const method = config.method?.toUpperCase() || 'GET'
      const url = config.url || ''
      const body = config.data ? JSON.stringify(config.data) : ''
      
      const signature = this.generateSignature(timestamp, method, url, body)
      
      config.headers = {
        ...config.headers,
        'X-App-Token': this.apiKey,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
      } as any

      return config
    })
  }

  async createApplicant(userId: string, userData: any) {
    try {
      const applicantData = {
        externalUserId: userId,
        info: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          dob: userData.dateOfBirth,
          country: userData.country,
          phone: userData.phoneNumber,
        },
      }

      const response = await this.apiClient.post('/resources/applicants', applicantData)
      return response.data
    } catch (error) {
      throw new InternalServerErrorException('Failed to create Sumsub applicant')
    }
  }

  async uploadDocument(applicantId: string, documentType: string, file: Buffer, fileName: string) {
    try {
      const formData = new FormData()
      formData.append('content', file, fileName)
      
      const response = await this.apiClient.post(
        `/resources/applicants/${applicantId}/info/idDoc`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          params: {
            type: this.mapDocumentType(documentType),
          },
        }
      )

      return response.data
    } catch (error) {
      throw new BadRequestException('Failed to upload document to Sumsub')
    }
  }

  async getApplicantStatus(applicantId: string) {
    try {
      const response = await this.apiClient.get(`/resources/applicants/${applicantId}/status`)
      return response.data
    } catch (error) {
      throw new InternalServerErrorException('Failed to get applicant status from Sumsub')
    }
  }

  async getApplicantData(applicantId: string) {
    try {
      const response = await this.apiClient.get(`/resources/applicants/${applicantId}/one`)
      return response.data
    } catch (error) {
      throw new InternalServerErrorException('Failed to get applicant data from Sumsub')
    }
  }

  async requestCheck(applicantId: string) {
    try {
      const response = await this.apiClient.post(`/resources/applicants/${applicantId}/status/pending`)
      return response.data
    } catch (error) {
      throw new InternalServerErrorException('Failed to request check from Sumsub')
    }
  }

  async resetApplicant(applicantId: string) {
    try {
      const response = await this.apiClient.post(`/resources/applicants/${applicantId}/reset`)
      return response.data
    } catch (error) {
      throw new InternalServerErrorException('Failed to reset applicant in Sumsub')
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  private generateSignature(timestamp: number, method: string, url: string, body: string): string {
    const data = `${timestamp}${method}${url}${body}`
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex')
  }

  private mapDocumentType(documentType: string): string {
    const typeMap = {
      identity: 'PASSPORT',
      proof_of_address: 'UTILITY_BILL',
      selfie: 'SELFIE',
      additional: 'OTHER',
    }
    
    return typeMap[documentType] || 'OTHER'
  }

  mapSumsubStatus(sumsubStatus: string): string {
    const statusMap = {
      init: 'pending',
      pending: 'processing',
      queued: 'processing',
      completed: 'approved',
      onHold: 'processing',
      rejected: 'rejected',
      temporarilyDeclined: 'resubmission_required',
    }
    
    return statusMap[sumsubStatus] || 'pending'
  }
}