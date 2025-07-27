import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

describe('Betting E2E Tests', () => {
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
      email: 'bettor@example.com',
      password: 'SecurePassword123!',
      firstName: 'John',
      lastName: 'Bettor',
      country: 'Kenya',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(userData);

    userToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;

    // Add funds to wallet for betting
    await request(app.getHttpServer())
      .post('/api/wallet/add-funds')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        amount: 1000,
        paymentMethod: 'test',
        currency: 'USD',
      });
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongod.stop();
    await app.close();
  });

  describe('Bet Placement', () => {
    it('should place a single bet successfully', async () => {
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 2.50,
            sport: 'soccer',
          },
        ],
        stake: 10,
        betType: 'single',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/betting/place-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData)
        .expect(201);

      expect(response.body).toHaveProperty('betId');
      expect(response.body).toHaveProperty('reference');
      expect(response.body.stake).toBe(betData.stake);
      expect(response.body.potentialWin).toBe(25); // 10 * 2.5
      expect(response.body.status).toBe('pending');
    });

    it('should place a multiple bet successfully', async () => {
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 2.00,
            sport: 'soccer',
          },
          {
            eventId: 'test-event-2',
            marketId: 'match-winner',
            outcomeId: 'team-b',
            odds: 1.80,
            sport: 'soccer',
          },
        ],
        stake: 20,
        betType: 'multiple',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/betting/place-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData)
        .expect(201);

      expect(response.body.potentialWin).toBe(72); // 20 * 2.0 * 1.8
      expect(response.body.selections).toHaveLength(2);
    });

    it('should reject bet with insufficient funds', async () => {
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 2.50,
            sport: 'soccer',
          },
        ],
        stake: 2000, // More than available balance
        betType: 'single',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/betting/place-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData)
        .expect(400);
    });

    it('should reject bet with invalid odds', async () => {
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 0.5, // Invalid odds
            sport: 'soccer',
          },
        ],
        stake: 10,
        betType: 'single',
        currency: 'USD',
      };

      await request(app.getHttpServer())
        .post('/api/betting/place-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData)
        .expect(400);
    });
  });

  describe('Bet Management', () => {
    let betId: string;

    beforeEach(async () => {
      // Place a test bet
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 2.50,
            sport: 'soccer',
          },
        ],
        stake: 10,
        betType: 'single',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/betting/place-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData);

      betId = response.body.betId;
    });

    it('should retrieve user bets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/betting/my-bets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('bets');
      expect(response.body.bets).toBeInstanceOf(Array);
      expect(response.body.bets.length).toBeGreaterThan(0);
    });

    it('should retrieve active bets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/betting/active-bets')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      const activeBet = response.body.find(bet => bet.betId === betId);
      expect(activeBet).toBeDefined();
      expect(activeBet.status).toBe('pending');
    });

    it('should retrieve specific bet details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/betting/bet/${betId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.betId).toBe(betId);
      expect(response.body).toHaveProperty('selections');
      expect(response.body).toHaveProperty('stake');
      expect(response.body).toHaveProperty('potentialWin');
    });

    it('should get betting statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/betting/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalBets');
      expect(response.body).toHaveProperty('totalStaked');
      expect(response.body).toHaveProperty('totalWon');
      expect(response.body).toHaveProperty('winRate');
    });
  });

  describe('Bet Validation', () => {
    it('should validate bet before placement', async () => {
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 2.50,
            sport: 'soccer',
          },
        ],
        stake: 10,
        betType: 'single',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/betting/validate-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData)
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(true);
      expect(response.body).toHaveProperty('potentialWin');
      expect(response.body).toHaveProperty('totalStake');
    });

    it('should identify invalid bet combinations', async () => {
      const betData = {
        selections: [
          {
            eventId: 'test-event-1',
            marketId: 'match-winner',
            outcomeId: 'team-a',
            odds: 2.50,
            sport: 'soccer',
          },
          {
            eventId: 'test-event-1', // Same event
            marketId: 'total-goals',
            outcomeId: 'over-2.5',
            odds: 1.80,
            sport: 'soccer',
          },
        ],
        stake: 10,
        betType: 'multiple',
        currency: 'USD',
      };

      const response = await request(app.getHttpServer())
        .post('/api/betting/validate-bet')
        .set('Authorization', `Bearer ${userToken}`)
        .send(betData)
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body).toHaveProperty('errors');
    });
  });
});
