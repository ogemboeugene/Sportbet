# 🔐 Environment Setup Guide

This guide helps you set up your environment variables securely for the SportBet platform.

## 🚨 Security First

**NEVER commit real API keys or credentials to version control!**

## 📋 Quick Setup

### 1. Server Environment

```bash
cd server
cp ../.env.example .env
```

Then edit `server/.env` with your real credentials:

```bash
# Example of what to replace:
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/your-database

# Payment Gateway Keys (get from your provider dashboards)
STRIPE_SECRET_KEY=sk_test_your_real_stripe_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_real_flutterwave_key

# Firebase Configuration (from your Firebase project)
FIREBASE_API_KEY=your_real_firebase_api_key
FIREBASE_PROJECT_ID=your_real_project_id
```

### 2. Client Environment

```bash
cd client
echo "VITE_API_URL=http://localhost:3000" > .env.local
echo "VITE_FIREBASE_API_KEY=your_firebase_api_key" >> .env.local
```

## 🔑 Required Services

### MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in your `.env` file

### Payment Gateways

#### Stripe
- Dashboard: https://dashboard.stripe.com/
- Get your test keys from the API section
- For production, use live keys

#### Flutterwave
- Dashboard: https://dashboard.flutterwave.com/
- Get test keys from the Settings > API section

#### M-Pesa (Optional)
- Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- Get sandbox credentials

### Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Get your web config from Project Settings
4. For server-side, download service account JSON

### Sports API
- Sign up at [The Odds API](https://the-odds-api.com/)
- Get your API key from the dashboard
- Free tier includes 500 requests/month

## 🔒 Security Best Practices

1. **Use different credentials for development/production**
2. **Rotate API keys regularly**
3. **Use environment-specific configurations**
4. **Never share credentials in chat/email**
5. **Enable 2FA on all service accounts**

## 🚨 If You Accidentally Commit Secrets

1. **Immediately rotate the exposed credentials**
2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch path/to/file' --prune-empty --tag-name-filter cat -- --all
   git push --force-with-lease origin main
   ```
3. **Contact the service providers to invalidate the keys**

## 📞 Support

If you need help with environment setup:
- Check the main README.md
- Create an issue on GitHub
- Follow the deployment guides in DEPLOYMENT.md

---
**Remember: Security is everyone's responsibility! 🔐**
