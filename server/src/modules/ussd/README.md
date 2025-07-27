# USSD Betting Interface

This module implements a USSD (Unstructured Supplementary Service Data) interface for the betting platform, allowing users to place bets using basic mobile phones without internet connectivity.

## Features

### 1. USSD Menu System
- Hierarchical menu navigation using Africa's Talking USSD API
- Session-based state management with automatic expiry
- User-friendly menu flow with back navigation and help system

### 2. Session Management
- Automatic session creation and tracking
- 5-minute session timeout with activity-based renewal
- Session state persistence in MongoDB
- Menu history tracking for navigation

### 3. User Authentication
- Phone number-based registration and login
- 4-digit PIN authentication system
- Account creation through USSD interface
- Secure session management

### 4. Betting Flow
- Sport selection from available markets
- Event browsing with real-time odds
- Bet placement with stake validation
- Balance checking and bet confirmation
- Bet history and active bets viewing

### 5. Account Management
- Balance inquiry
- Transaction history
- Responsible gambling limits
- Account settings

## USSD Menu Structure

```
Main Menu
├── 1. Login
│   ├── Enter Phone Number
│   ├── Enter PIN
│   └── → Account Menu
├── 2. Register
│   ├── Enter Phone Number
│   ├── Enter Full Name
│   ├── Create PIN
│   ├── Confirm PIN
│   └── → Account Menu
├── 3. Help
│   ├── 1. How to Bet
│   ├── 2. Account Help
│   ├── 3. Navigation Help
│   └── 4. Contact Support
└── 0. Exit

Account Menu (After Login)
├── 1. Check Balance
├── 2. Betting Menu
│   ├── 1. View Sports
│   │   ├── Select Sport
│   │   ├── Select Event
│   │   ├── Select Market
│   │   ├── Select Outcome
│   │   ├── Enter Stake
│   │   └── Confirm Bet
│   ├── 2. My Active Bets
│   └── 3. Bet History
├── 3. Bet History
├── 4. Help
├── 0. Logout
└── *. Main Menu
```

## API Endpoints

### USSD Callback
```
POST /ussd/callback
Content-Type: application/x-www-form-urlencoded

sessionId=<session_id>&serviceCode=*123#&phoneNumber=<phone>&text=<user_input>
```

### Test Endpoint (Development)
```
POST /ussd/test
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "text": "1*2*3"
}
```

## Session Data Structure

```typescript
interface UssdSession {
  sessionId: string;
  phoneNumber: string;
  userId?: string;
  currentMenu: string;
  sessionData: Record<string, any>;
  menuHistory: string[];
  lastActivity: Date;
  isActive: boolean;
  expiresAt: Date;
}
```

## Navigation Commands

- **Numbers (1-9)**: Select menu options
- **0**: Go back to previous menu
- **\***: Return to main menu
- **#**: End session (automatic)

## Error Handling

- Invalid input validation with user-friendly messages
- Session timeout handling with graceful degradation
- Network error recovery with retry mechanisms
- Balance and betting limit validation

## Security Features

- PIN-based authentication
- Session expiry and cleanup
- Input validation and sanitization
- Rate limiting protection
- Secure session state management

## Integration Points

### Dependencies
- **UsersService**: User authentication and management
- **WalletService**: Balance checking and transactions
- **BettingService**: Bet placement and history
- **OddsService**: Sports data and odds retrieval

### External Services
- **Africa's Talking USSD API**: USSD gateway integration
- **MongoDB**: Session and user data storage
- **Redis**: Caching for performance optimization

## Configuration

Required environment variables:
```bash
AFRICAS_TALKING_USERNAME=your-username
AFRICAS_TALKING_API_KEY=your-api-key
MONGODB_URI=mongodb://localhost:27017/betting-db
```

## Usage Examples

### First-time User Registration
```
*123# → Welcome Menu
2 → Register
+1234567890 → Phone Number
John Doe → Full Name
1234 → PIN
1234 → Confirm PIN
→ Registration Successful
```

### Placing a Bet
```
*123# → Welcome Menu
1 → Login
+1234567890 → Phone Number
1234 → PIN
2 → Betting Menu
1 → View Sports
1 → Football
1 → Team A vs Team B
1 → Match Winner
2 → Team A @ 2.50
10 → Stake $10
1 → Confirm Bet
→ Bet Placed Successfully
```

### Checking Balance
```
*123# → Welcome Menu
1 → Login
+1234567890 → Phone Number
1234 → PIN
1 → Check Balance
→ Balance: $150.00
```

## Testing

Run USSD-specific tests:
```bash
npm test -- --testPathPattern=ussd
```

Test USSD flow manually:
```bash
curl -X POST http://localhost:3000/ussd/test \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "text": ""}'
```

## Monitoring and Analytics

- Session duration tracking
- Menu navigation patterns
- Error rate monitoring
- User engagement metrics
- Bet placement success rates

## Future Enhancements

- Multi-language support
- Voice prompts integration
- Advanced betting features (live betting, cash out)
- Promotional offers via USSD
- Customer support chat integration