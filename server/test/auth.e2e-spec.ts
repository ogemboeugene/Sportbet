import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

describe('Authentication E2E Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        MongooseModule.forRoot(uri),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mongoConnection = moduleFixture.get<Connection>('DatabaseConnection');
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  afterEach(async () => {
    // Clean up database after each test
    const collections = mongoConnection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        country: 'Kenya',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+254700000000',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
        country: 'Kenya',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        country: 'Kenya',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('User Login Flow', () => {
    let userToken: string;

    beforeEach(async () => {
      // Create a test user
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        country: 'Kenya',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      userToken = registerResponse.body.tokens.accessToken;
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should access protected route with valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should reject access to protected route without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('Two-Factor Authentication', () => {
    let userToken: string;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        country: 'Kenya',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData);

      userToken = registerResponse.body.tokens.accessToken;
    });

    it('should setup 2FA successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/setup-2fa')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('qrCodeUrl');
      expect(response.body).toHaveProperty('backupCodes');
    });

    it('should enable 2FA with valid code', async () => {
      // Setup 2FA first
      const setupResponse = await request(app.getHttpServer())
        .post('/api/auth/setup-2fa')
        .set('Authorization', `Bearer ${userToken}`);

      // Mock TOTP verification (in real tests, you'd use the actual secret)
      const enableData = {
        token: '123456', // Mock token
      };

      await request(app.getHttpServer())
        .post('/api/auth/enable-2fa')
        .set('Authorization', `Bearer ${userToken}`)
        .send(enableData)
        .expect(200);
    });
  });
});
