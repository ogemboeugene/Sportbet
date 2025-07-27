# 🏆 SportBet - Professional Sports Betting Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10+-E0234E.svg)](https://nestjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

## 🎯 Overview

SportBet is a comprehensive, production-ready sports betting platform built with modern technologies. It features real-time odds integration, secure payment processing, advanced user management, and professional-grade monitoring.

### ✨ Key Features

- **🔴 Live Sports Betting** - Real-time odds from multiple bookmakers
- **💰 Multi-Payment Gateway** - Stripe, Flutterwave, PayPal, M-Pesa integration
- **🔐 Advanced Security** - JWT authentication, KYC verification, 2FA
- **📱 Responsive Design** - Mobile-first, professional UI/UX
- **📊 Analytics & Monitoring** - Grafana, Prometheus, comprehensive logging
- **🎮 Responsible Gaming** - Self-exclusion, deposit limits, session monitoring
- **🌍 Multi-Currency** - Support for multiple currencies and regions

## 🏗️ Architecture

### Backend (NestJS)
- **RESTful API** with comprehensive endpoints
- **Real-time WebSocket** integration
- **MongoDB Atlas** database with optimized schemas
- **Redis** for caching and session management
- **Microservices-ready** architecture

### Frontend (React + Vite)
- **TypeScript** for type safety
- **Redux Toolkit** for state management
- **Tailwind CSS** for styling
- **Progressive Web App** capabilities

### DevOps & Monitoring
- **Docker** containerization
- **CI/CD** pipelines
- **Grafana** dashboards
- **Prometheus** metrics
- **Loki** log aggregation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Odds API key
- Payment gateway accounts (Stripe, Flutterwave, etc.)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ogemboeugene/Sportbet.git
cd Sportbet
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

3. **Environment Configuration**
```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit with your configuration
nano server/.env
nano client/.env
```

4. **Start development servers**
```bash
# Start backend (from server directory)
cd server && npm run start:dev

# Start frontend (from client directory)
cd client && npm run dev
```

## 🔧 Configuration

### Server Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://your-connection-string

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Sports Data
ODDS_API_KEY=your-odds-api-key
ODDS_API_BASE_URL=https://api.the-odds-api.com

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
MPESA_CONSUMER_KEY=your-mpesa-key

# Notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Client Environment Variables

```bash
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh

### Sports & Odds
- `GET /api/odds/sports` - Get all sports
- `GET /api/odds/sports/:sportKey/odds` - Get live odds
- `GET /api/odds/search` - Search events

### Betting
- `POST /api/betting/place-bet` - Place a bet
- `GET /api/betting/my-bets` - User's betting history
- `GET /api/betting/stats` - Betting statistics

### Payments
- `POST /api/wallet/deposit` - Make a deposit
- `POST /api/wallet/withdraw` - Request withdrawal
- `GET /api/wallet/transactions` - Transaction history

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **bcrypt** password hashing with configurable rounds
- **Rate limiting** on all endpoints
- **CORS** protection
- **Input validation** with class-validator
- **XSS** and **CSRF** protection
- **KYC verification** integration
- **Responsible gambling** controls

## 🏦 Payment Integration

### Supported Gateways
- **Stripe** - Credit/debit cards, digital wallets
- **Flutterwave** - African payment methods
- **PayPal** - Global payments
- **M-Pesa** - Mobile money (Kenya)
- **Bank transfers** - Direct bank integration

### Security
- **PCI DSS** compliant payment processing
- **3D Secure** authentication
- **Fraud detection** and prevention
- **Encrypted** transaction data

## 📊 Monitoring & Analytics

### Grafana Dashboards
- System performance metrics
- User activity analytics
- Betting volume and trends
- Payment transaction monitoring

### Prometheus Metrics
- API response times
- Database query performance
- Error rates and alerts
- Resource utilization

### Logging
- Structured logging with Winston
- Centralized log aggregation
- Error tracking and alerts
- Audit trail for compliance

## 🎮 Responsible Gaming

- **Self-exclusion** tools
- **Deposit limits** (daily, weekly, monthly)
- **Session time** limits
- **Reality checks** and notifications
- **Problem gambling** resources
- **Age verification** and KYC

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

```bash
# Run server tests
cd server && npm run test

# Run e2e tests
npm run test:e2e

# Run client tests
cd client && npm run test
```

## 📱 Mobile App

The platform is built as a Progressive Web App (PWA) with:
- **Offline functionality**
- **Push notifications**
- **App-like experience**
- **Mobile-optimized UI**

## 🌐 Internationalization

- Multi-language support
- Regional payment methods
- Local currency support
- Timezone handling

## 📈 Performance

- **Redis caching** for improved response times
- **Database indexing** for fast queries
- **CDN integration** for static assets
- **Image optimization** and lazy loading
- **Code splitting** for faster page loads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Eugene Ogombo** - Lead Developer
- **Contributors welcome!**

## 📞 Support

For support, email support@sportbet.com or join our Slack channel.

## 🔗 Links

- [Live Demo](https://sportbet-demo.com)
- [Documentation](https://docs.sportbet.com)
- [API Reference](https://api.sportbet.com/docs)

---

⚠️ **Disclaimer**: This platform is for educational and demonstration purposes. Ensure compliance with local gambling laws and regulations before deploying for commercial use.

🎲 **Gamble Responsibly** - When the fun stops, stop.
