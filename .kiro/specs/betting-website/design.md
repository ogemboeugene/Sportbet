# Betting Website Design Document

## Overview

This document outlines the technical design for a production-ready betting website built with React.js frontend and Node.js backend. The system follows microservices architecture principles with clear separation of concerns, implementing modern development practices including containerization, CI/CD, and comprehensive security measures.

### Technology Stack

**Frontend:**
- React.js 18+ with TypeScript
- State Management: Redux Toolkit + RTK Query
- Styling: TailwindCSS with CSS Modules
- Build Tool: Vite
- Testing: Jest + React Testing Library

**Backend:**
- Node.js with NestJS framework
- Database: MongoDB Atlas with Mongoose ODM
- Authentication: JWT + Firebase Auth
- File Storage: Firebase Storage
- Real-time: Socket.io

**Third-Party Integrations:**
- KYC: Sumsub API
- Payments: Flutterwave, Paystack, Stripe, M-Pesa, PayPal
- Sports Data: OddsAPI
- Notifications: Firebase Cloud Messaging
- SMS/USSD: Africa's Talking
- AI: OpenAI API

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App - React]
        MOBILE[Mobile App - React Native]
        SMS[SMS Interface]
        USSD[USSD Interface]
    end
    
    subgraph "API Gateway"
        GATEWAY[NestJS API Gateway]
        AUTH[Auth Middleware]
        RATE[Rate Limiting]
    end
    
    subgraph "Microservices"
        USER[User Service]
        WALLET[Wallet Service]
        BETTING[Betting Service]
        ODDS[Odds Service]
        NOTIFY[Notification Service]
        KYC[KYC Service]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB Atlas)]
        REDIS[(Redis Cache)]
        FIREBASE[Firebase Storage]
    end
    
    subgraph "External APIs"
        ODDSAPI[OddsAPI]
        SUMSUB[Sumsub KYC]
        PAYMENTS[Payment Gateways]
        FCM[Firebase Cloud Messaging]
        AFRICAS[Africa's Talking]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    SMS --> GATEWAY
    USSD --> GATEWAY
    
    GATEWAY --> AUTH
    AUTH --> USER
    AUTH --> WALLET
    AUTH --> BETTING
    AUTH --> ODDS
    AUTH --> NOTIFY
    AUTH --> KYC
    
    USER --> MONGO
    WALLET --> MONGO
    BETTING --> MONGO
    ODDS --> REDIS
    
    ODDS --> ODDSAPI
    KYC --> SUMSUB
    WALLET --> PAYMENTS
    NOTIFY --> FCM
    SMS --> AFRICAS
    USSD --> AFRICAS
```

### Project Structure

```
betting-platform/
├── client/                          # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Generic components
│   │   │   ├── forms/               # Form components
│   │   │   ├── layout/              # Layout components
│   │   │   └── betting/             # Betting-specific components
│   │   ├── pages/                   # Page components
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── store/                   # Redux store configuration
│   │   ├── services/                # API service layer
│   │   ├── utils/                   # Utility functions
│   │   ├── types/                   # TypeScript type definitions
│   │   └── styles/                  # Global styles and themes
│   ├── package.json
│   └── vite.config.ts
├── server/                          # NestJS Backend
│   ├── src/
│   │   ├── modules/                 # Feature modules
│   │   │   ├── auth/                # Authentication module
│   │   │   ├── users/               # User management
│   │   │   ├── wallet/              # Wallet & transactions
│   │   │   ├── betting/             # Betting engine
│   │   │   ├── odds/                # Odds management
│   │   │   ├── kyc/                 # KYC verification
│   │   │   ├── notifications/       # Notification system
│   │   │   └── admin/               # Admin dashboard
│   │   ├── common/                  # Shared utilities
│   │   │   ├── decorators/          # Custom decorators
│   │   │   ├── filters/             # Exception filters
│   │   │   ├── guards/              # Auth guards
│   │   │   ├── interceptors/        # Request/response interceptors
│   │   │   └── pipes/               # Validation pipes
│   │   ├── config/                  # Configuration files
│   │   └── database/                # Database schemas and migrations
│   ├── package.json
│   └── nest-cli.json
├── shared/                          # Shared types and utilities
├── docker-compose.yml
├── .github/workflows/               # CI/CD pipelines
└── README.md
```

## Components and Interfaces

### Frontend Component Architecture

#### Core Components

**Layout Components:**
```typescript
// components/layout/AppLayout.tsx
interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  theme: 'light' | 'dark';
}

// components/layout/Header.tsx
interface HeaderProps {
  user?: User;
  onThemeToggle: () => void;
  notifications: Notification[];
}

// components/layout/Sidebar.tsx
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
}
```

**Betting Components:**
```typescript
// components/betting/BetSlip.tsx
interface BetSlipProps {
  selections: BetSelection[];
  onRemoveSelection: (id: string) => void;
  onPlaceBet: (betData: BetData) => Promise<void>;
  maxStake: number;
}

// components/betting/OddsDisplay.tsx
interface OddsDisplayProps {
  odds: Odds;
  format: 'decimal' | 'fractional' | 'american';
  onSelect: (selection: BetSelection) => void;
  isSelected?: boolean;
}

// components/betting/SportsList.tsx
interface SportsListProps {
  sports: Sport[];
  selectedSport?: string;
  onSportSelect: (sportId: string) => void;
  loading?: boolean;
}
```

**Form Components:**
```typescript
// components/forms/LoginForm.tsx
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  loading?: boolean;
  error?: string;
}

// components/forms/DepositForm.tsx
interface DepositFormProps {
  paymentMethods: PaymentMethod[];
  onDeposit: (amount: number, method: string) => Promise<void>;
  minAmount: number;
  maxAmount: number;
}
```

#### State Management Structure

```typescript
// store/index.ts
export interface RootState {
  auth: AuthState;
  user: UserState;
  wallet: WalletState;
  betting: BettingState;
  odds: OddsState;
  ui: UIState;
}

// store/slices/authSlice.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// store/slices/bettingSlice.ts
interface BettingState {
  betSlip: BetSelection[];
  activeBets: Bet[];
  betHistory: Bet[];
  loading: boolean;
  error: string | null;
}
```

### Backend Service Architecture

#### Module Structure

**Auth Module:**
```typescript
// modules/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {}
  
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {}
  
  @Post('verify-2fa')
  async verify2FA(@Body() verifyDto: Verify2FADto): Promise<AuthResponse> {}
}

// modules/auth/auth.service.ts
@Injectable()
export class AuthService {
  async validateUser(email: string, password: string): Promise<User | null> {}
  async generateTokens(user: User): Promise<TokenPair> {}
  async verify2FA(userId: string, token: string): Promise<boolean> {}
}
```

**Betting Module:**
```typescript
// modules/betting/betting.controller.ts
@Controller('betting')
export class BettingController {
  @Post('place-bet')
  @UseGuards(JwtAuthGuard)
  async placeBet(@Body() betDto: PlaceBetDto, @User() user: UserEntity): Promise<Bet> {}
  
  @Get('active-bets')
  @UseGuards(JwtAuthGuard)
  async getActiveBets(@User() user: UserEntity): Promise<Bet[]> {}
}

// modules/betting/betting.service.ts
@Injectable()
export class BettingService {
  async placeBet(userId: string, betData: PlaceBetDto): Promise<Bet> {}
  async settleBet(betId: string, outcome: BetOutcome): Promise<void> {}
  async validateBet(betData: PlaceBetDto): Promise<ValidationResult> {}
}
```

## Data Models

### MongoDB Schemas

#### User Schema
```typescript
// database/schemas/user.schema.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Prop({ type: Object })
  profile: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    phoneNumber: string;
    country: string;
  };

  @Prop({ enum: ['pending', 'verified', 'rejected'], default: 'pending' })
  kycStatus: string;

  @Prop({ type: Object })
  preferences: {
    theme: 'light' | 'dark';
    oddsFormat: 'decimal' | 'fractional' | 'american';
    currency: string;
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };

  @Prop({ type: Object })
  limits: {
    dailyDeposit: number;
    weeklyDeposit: number;
    monthlyDeposit: number;
    sessionTime: number;
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}
```

#### Wallet Schema
```typescript
// database/schemas/wallet.schema.ts
@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  balance: number;

  @Prop({ default: 0, min: 0 })
  bonusBalance: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: Date.now })
  lastActivity: Date;
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ enum: ['deposit', 'withdrawal', 'bet', 'win', 'refund'], required: true })
  type: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' })
  status: string;

  @Prop()
  paymentMethod?: string;

  @Prop()
  externalTransactionId?: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}
```

#### Bet Schema
```typescript
// database/schemas/bet.schema.ts
@Schema({ timestamps: true })
export class Bet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  stake: number;

  @Prop({ required: true })
  potentialWin: number;

  @Prop({ enum: ['single', 'multiple', 'system'], required: true })
  betType: string;

  @Prop({ enum: ['pending', 'won', 'lost', 'void', 'cashout'], default: 'pending' })
  status: string;

  @Prop([{
    eventId: String,
    marketId: String,
    selectionId: String,
    odds: Number,
    eventName: String,
    marketName: String,
    selectionName: String,
    startTime: Date,
    status: { type: String, enum: ['pending', 'won', 'lost', 'void'], default: 'pending' }
  }])
  selections: BetSelection[];

  @Prop()
  settledAt?: Date;

  @Prop()
  winAmount?: number;
}
```

#### Sports & Odds Schema
```typescript
// database/schemas/sport.schema.ts
@Schema({ timestamps: true })
export class Sport {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 0 })
  order: number;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, unique: true })
  eventId: string;

  @Prop({ required: true })
  sportKey: string;

  @Prop({ required: true })
  homeTeam: string;

  @Prop({ required: true })
  awayTeam: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop([{
    marketId: String,
    marketName: String,
    selections: [{
      selectionId: String,
      selectionName: String,
      odds: Number,
      active: { type: Boolean, default: true }
    }]
  }])
  markets: Market[];

  @Prop({ enum: ['upcoming', 'live', 'finished', 'cancelled'], default: 'upcoming' })
  status: string;
}
```

## Error Handling

### Frontend Error Handling

```typescript
// utils/errorHandler.ts
export class ErrorHandler {
  static handleApiError(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    switch (error.response?.status) {
      case 401:
        return 'Please log in to continue';
      case 403:
        return 'You do not have permission to perform this action';
      case 429:
        return 'Too many requests. Please try again later';
      case 500:
        return 'Server error. Please try again later';
      default:
        return 'An unexpected error occurred';
    }
  }
}

// components/common/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### Backend Error Handling

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    response.status(status).json(errorResponse);
  }
}

// common/exceptions/custom.exceptions.ts
export class InsufficientFundsException extends HttpException {
  constructor() {
    super('Insufficient funds in wallet', HttpStatus.BAD_REQUEST);
  }
}

export class BetValidationException extends HttpException {
  constructor(message: string) {
    super(`Bet validation failed: ${message}`, HttpStatus.BAD_REQUEST);
  }
}
```

## Testing Strategy

### Frontend Testing

```typescript
// __tests__/components/BetSlip.test.tsx
describe('BetSlip Component', () => {
  const mockProps = {
    selections: mockBetSelections,
    onRemoveSelection: jest.fn(),
    onPlaceBet: jest.fn(),
    maxStake: 1000
  };

  it('should render bet selections correctly', () => {
    render(<BetSlip {...mockProps} />);
    expect(screen.getByText('Bet Slip')).toBeInTheDocument();
  });

  it('should calculate total odds correctly', () => {
    render(<BetSlip {...mockProps} />);
    const totalOdds = screen.getByTestId('total-odds');
    expect(totalOdds).toHaveTextContent('2.50');
  });

  it('should validate stake amount', async () => {
    render(<BetSlip {...mockProps} />);
    const stakeInput = screen.getByLabelText('Stake Amount');
    
    fireEvent.change(stakeInput, { target: { value: '2000' } });
    fireEvent.click(screen.getByText('Place Bet'));
    
    expect(screen.getByText('Stake exceeds maximum limit')).toBeInTheDocument();
  });
});

// __tests__/hooks/useBetting.test.ts
describe('useBetting Hook', () => {
  it('should add selection to bet slip', () => {
    const { result } = renderHook(() => useBetting());
    
    act(() => {
      result.current.addSelection(mockSelection);
    });
    
    expect(result.current.betSlip).toHaveLength(1);
    expect(result.current.betSlip[0]).toEqual(mockSelection);
  });
});
```

### Backend Testing

```typescript
// modules/betting/betting.service.spec.ts
describe('BettingService', () => {
  let service: BettingService;
  let walletService: WalletService;
  let oddsService: OddsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BettingService,
        { provide: WalletService, useValue: mockWalletService },
        { provide: OddsService, useValue: mockOddsService },
      ],
    }).compile();

    service = module.get<BettingService>(BettingService);
  });

  describe('placeBet', () => {
    it('should place a valid bet successfully', async () => {
      const betData = { selections: [mockSelection], stake: 10 };
      const result = await service.placeBet('userId', betData);
      
      expect(result).toBeDefined();
      expect(result.stake).toBe(10);
      expect(walletService.deductFunds).toHaveBeenCalledWith('userId', 10);
    });

    it('should throw error for insufficient funds', async () => {
      walletService.getBalance.mockResolvedValue(5);
      const betData = { selections: [mockSelection], stake: 10 };
      
      await expect(service.placeBet('userId', betData))
        .rejects.toThrow(InsufficientFundsException);
    });
  });
});

// e2e/betting.e2e-spec.ts
describe('Betting (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/betting/place-bet (POST)', () => {
    return request(app.getHttpServer())
      .post('/betting/place-bet')
      .set('Authorization', `Bearer ${authToken}`)
      .send(mockBetData)
      .expect(201)
      .expect((res) => {
        expect(res.body.stake).toBe(mockBetData.stake);
      });
  });
});
```

### Environment Variables Required

```bash
# .env.example
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/betting-db
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id

# Payment Gateways
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
MPESA_CONSUMER_KEY=xxxxx
MPESA_CONSUMER_SECRET=xxxxx

# KYC Services
SUMSUB_API_KEY=your-sumsub-api-key
SUMSUB_SECRET_KEY=your-sumsub-secret-key
SUMSUB_BASE_URL=https://api.sumsub.com

# Sports Data
ODDS_API_KEY=your-odds-api-key
ODDS_API_BASE_URL=https://api.the-odds-api.com

# Notifications
FCM_SERVER_KEY=your-fcm-server-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS/USSD
AFRICAS_TALKING_USERNAME=your-username
AFRICAS_TALKING_API_KEY=your-api-key

# AI Services
OPENAI_API_KEY=sk-xxxxx

# Application
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Storage
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

This design provides a comprehensive foundation for building a production-ready betting website with all the specified features, following modern development practices and ensuring scalability, security, and maintainability.