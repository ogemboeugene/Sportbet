import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name)
  private app: admin.app.App

  onModuleInit() {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = this.getServiceAccountConfig()
      
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      })

      this.logger.log('Firebase Admin SDK initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error.message)
      // In development, we can continue without Firebase
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn('Running without Firebase in development mode')
      } else {
        throw error
      }
    }
  }

  getMessaging(): admin.messaging.Messaging {
    if (!this.app) {
      throw new Error('Firebase not initialized')
    }
    return admin.messaging(this.app)
  }

  private getServiceAccountConfig(): admin.ServiceAccount {
    // Try to load from service account file path first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        const filePath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        if (fs.existsSync(filePath)) {
          const serviceAccountFile = fs.readFileSync(filePath, 'utf8')
          return JSON.parse(serviceAccountFile)
        } else {
          this.logger.warn(`Service account file not found at: ${filePath}`)
        }
      } catch (error) {
        this.logger.error('Failed to load service account from file:', error.message)
      }
    }

    // Try to get service account from environment variables
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      } catch (error) {
        this.logger.error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON')
        throw error
      }
    }

    // Fallback to individual environment variables
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      return {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }
    }

    // Development fallback - create a mock service account
    if (process.env.NODE_ENV !== 'production') {
      this.logger.warn('Using mock Firebase configuration for development')
      return {
        projectId: 'mock-project',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----\n',
        clientEmail: 'mock@mock-project.iam.gserviceaccount.com',
      }
    }

    throw new Error('Firebase service account configuration not found')
  }

  isInitialized(): boolean {
    return !!this.app
  }
}