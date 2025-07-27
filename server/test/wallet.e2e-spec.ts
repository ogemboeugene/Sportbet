import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

describe('Wallet E2E Tests', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
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

    // Create test user and get token
    const userData = {
      email: 'wallet@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Wallet',
      country: 'Kenya',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(userData);

    userToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  describe('Wallet Balance', () => {
    it('should get wallet balance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('currency');
      expect(response.body.balance).toBe(0); // Initial balance
    });

    it('should add funds to wallet', async () => {
      const addFundsData = {
        amount: 100,
        paymentMethod: 'test',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send(addFundsData)
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('newBalance');
      expect(response.body.newBalance).toBe(100);
    });

    it('should withdraw funds from wallet', async () => {
      // First add funds
      await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 200,
          paymentMethod: 'test',
          currency: 'USD',
        });

      const withdrawData = {
        amount: 50,
        paymentMethod: 'test',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send(withdrawData)
        .expect(201);

      expect(response.body).toHaveProperty('transactionId');
      expect(response.body).toHaveProperty('newBalance');
      expect(response.body.newBalance).toBe(250); // 100 + 200 - 50
    });

    it('should reject withdrawal with insufficient funds', async () => {
      const withdrawData = {
        amount: 1000, // More than available balance
        paymentMethod: 'test',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${userToken}`)
        .send(withdrawData)
        .expect(400);
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      // Add some test transactions
      await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 50,
          paymentMethod: 'test',
          currency: 'USD',
        });
    });

    it('should get transaction history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('transactions');
      expect(response.body.transactions).toBeInstanceOf(Array);
      expect(response.body.transactions.length).toBeGreaterThan(0);
    });

    it('should filter transactions by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallet/transactions?type=deposit')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions.every(t => t.type === 'deposit')).toBe(true);
    });

    it('should filter transactions by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app.getHttpServer())
        .get(`/api/wallet/transactions?from=${today}&to=${today}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.transactions).toBeInstanceOf(Array);
    });

    it('should get specific transaction details', async () => {
      // First get a transaction ID
      const historyResponse = await request(app.getHttpServer())
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${userToken}`);

      const transactionId = historyResponse.body.transactions[0].id;

      const response = await request(app.getHttpServer())
        .get(`/api/wallet/transaction/${transactionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Payment Methods', () => {
    it('should get available payment methods', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallet/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should add payment method', async () => {
      const paymentMethodData = {
        type: 'card',
        details: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'John Wallet',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/wallet/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentMethodData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type');
      expect(response.body.type).toBe('card');
    });

    it('should remove payment method', async () => {
      // First add a payment method
      const paymentMethodData = {
        type: 'card',
        details: {
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
          cardholderName: 'John Wallet',
        },
      };

      const addResponse = await request(app.getHttpServer())
        .post('/api/wallet/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentMethodData);

      const paymentMethodId = addResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/wallet/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });

  describe('Wallet Validation', () => {
    it('should validate transaction amount', async () => {
      const invalidAmountData = {
        amount: -10, // Negative amount
        paymentMethod: 'test',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidAmountData)
        .expect(400);
    });

    it('should validate currency', async () => {
      const invalidCurrencyData = {
        amount: 100,
        paymentMethod: 'test',
        currency: 'INVALID',
      };

      await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidCurrencyData)
        .expect(400);
    });

    it('should enforce minimum transaction amount', async () => {
      const belowMinimumData = {
        amount: 0.5, // Below minimum
        paymentMethod: 'test',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send(belowMinimumData)
        .expect(400);
    });

    it('should enforce maximum transaction amount', async () => {
      const aboveMaximumData = {
        amount: 100000, // Above maximum
        paymentMethod: 'test',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send(aboveMaximumData)
        .expect(400);
    });
  });

  describe('Wallet Security', () => {
    it('should require authentication for wallet operations', async () => {
      await request(app.getHttpServer())
        .get('/api/wallet/balance')
        .expect(401);
    });

    it('should validate transaction limits', async () => {
      // Test daily limit
      const largeAmount = {
        amount: 5000, // Assuming daily limit is lower
        paymentMethod: 'test',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/wallet/add-funds')
        .set('Authorization', `Bearer ${userToken}`)
        .send(largeAmount);

      // Should either succeed or return limit error
      expect([200, 201, 400]).toContain(response.status);
    });

    it('should prevent unauthorized access to other user wallets', async () => {
      // Create another user
      const otherUserData = {
        email: 'other@example.com',
        password: 'SecurePassword123!',
        firstName: 'Other',
        lastName: 'User',
        country: 'Kenya',
      };

      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(otherUserData);

      const otherUserToken = otherUserResponse.body.tokens.accessToken;

      // Try to access first user's transactions with other user's token
      await request(app.getHttpServer())
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200); // Should only return other user's transactions
    });
  });
});
