# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- Git
- Minimum 4GB RAM, 2 CPU cores
- 20GB available disk space

### Required Accounts
- GitHub account (for CI/CD)
- Docker Hub account (for image registry)
- Cloud provider account (AWS/GCP/Azure)
- Domain registrar (for SSL certificates)

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/sportbet.git
cd sportbet
```

### 2. Environment Configuration
Copy and configure environment files:

```bash
# Production environment
cp .env.production.template .env.production

# Staging environment  
cp .env.staging.template .env.staging

# Local development
cp .env.example .env.local
```

### 3. Configure Environment Variables
Edit the environment files with your specific values:

#### Critical Variables to Update:
- `JWT_SECRET` - Generate secure random string
- `DATABASE_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `FIREBASE_*` - Firebase configuration
- `PAYMENT_*` - Payment provider credentials
- `SMTP_*` - Email service configuration
- `DOMAIN` - Your domain name
- `SSL_EMAIL` - Email for SSL certificates

## Local Development

### 1. Start Development Environment
```bash
# Install dependencies
npm install

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start development servers
npm run dev:backend &
npm run dev:frontend
```

### 2. Database Setup
```bash
# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 3. Verify Setup
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Grafana: http://localhost:3003 (admin/admin)
- Prometheus: http://localhost:9090

## Staging Deployment

### 1. Prepare Staging Environment
```bash
# Build and push images
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml push

# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d
```

### 2. Run Database Migrations
```bash
docker-compose -f docker-compose.staging.yml exec backend npm run migrate
```

### 3. Verify Deployment
```bash
# Check service health
docker-compose -f docker-compose.staging.yml ps

# Check logs
docker-compose -f docker-compose.staging.yml logs -f

# Test API endpoints
curl https://staging.sportbet.com/api/health
```

## Production Deployment

### 1. Pre-deployment Checklist
- [ ] All tests passing in CI/CD
- [ ] Security scan completed
- [ ] Database backup created
- [ ] SSL certificates valid
- [ ] DNS records configured
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment

### 2. Blue-Green Deployment
```bash
# Tag release
git tag v1.0.0
git push origin v1.0.0

# CI/CD will automatically:
# 1. Run tests and security scans
# 2. Build and push Docker images
# 3. Deploy to production
# 4. Run health checks
# 5. Switch traffic to new version
```

### 3. Post-deployment Verification
```bash
# Check service health
curl https://sportbet.com/api/health

# Monitor key metrics
curl https://sportbet.com/api/metrics

# Verify database connections
docker-compose exec backend npm run db:check
```

### 4. Manual Production Deployment (if needed)
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Stop services gracefully
docker-compose -f docker-compose.prod.yml down

# Start new version
docker-compose -f docker-compose.prod.yml up -d

# Verify health
docker-compose -f docker-compose.prod.yml exec backend npm run health-check
```

## Monitoring & Logging

### 1. Access Monitoring Dashboards
- **Grafana**: https://monitoring.sportbet.com
  - System Overview Dashboard
  - Application Metrics Dashboard
  - Business Intelligence Dashboard

- **Prometheus**: https://prometheus.sportbet.com
  - Raw metrics and alerting rules

### 2. Log Analysis
```bash
# View application logs
docker-compose logs -f backend frontend

# Search logs with Loki
curl -G -s "http://loki:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="backend"}' \
  --data-urlencode 'limit=100'
```

### 3. Alert Configuration
Alerts are automatically configured for:
- High error rates (>5%)
- Slow response times (>2s)
- High CPU/Memory usage (>80%)
- Database connection issues
- Security violations
- Failed payment transactions

## Backup & Recovery

### 1. Automated Backups
```bash
# Database backup (runs daily at 2 AM UTC)
docker-compose exec mongodb mongodump \
  --host localhost \
  --db sportbet \
  --out /backups/$(date +%Y%m%d)

# Upload to cloud storage
aws s3 sync /backups s3://sportbet-backups/mongodb/
```

### 2. Manual Backup
```bash
# Create immediate backup
./scripts/backup-database.sh

# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env.production docker-compose.prod.yml monitoring/
```

### 3. Recovery Procedures
```bash
# Restore from backup
./scripts/restore-database.sh BACKUP_DATE

# Verify restoration
docker-compose exec backend npm run db:verify
```

## Rollback Procedures

### 1. Automatic Rollback
CI/CD will automatically rollback if:
- Health checks fail after deployment
- Error rate exceeds 10%
- Response time exceeds 5 seconds

### 2. Manual Rollback
```bash
# Rollback to previous version
git revert HEAD
git push origin main

# Or rollback to specific version
docker-compose -f docker-compose.prod.yml down
docker tag sportbet/backend:previous sportbet/backend:latest
docker tag sportbet/frontend:previous sportbet/frontend:latest
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Database Rollback
```bash
# Rollback database migrations
docker-compose exec backend npm run migrate:rollback

# Restore from backup if needed
./scripts/restore-database.sh PREVIOUS_BACKUP_DATE
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check resource usage
docker stats

# Verify environment variables
docker-compose config
```

#### 2. Database Connection Issues
```bash
# Check MongoDB status
docker-compose exec mongodb mongo --eval "db.stats()"

# Verify connection string
docker-compose exec backend node -e "console.log(process.env.DATABASE_URL)"

# Test connection
docker-compose exec backend npm run db:test
```

#### 3. High Response Times
```bash
# Check application metrics
curl https://sportbet.com/api/metrics

# Monitor database performance
docker-compose exec mongodb mongostat

# Check Redis performance
docker-compose exec redis redis-cli info stats
```

#### 4. Memory Issues
```bash
# Check memory usage
docker stats --no-stream

# Restart services if needed
docker-compose restart backend

# Scale horizontally if persistent
docker-compose up -d --scale backend=3
```

### Health Check Endpoints
- Backend: `GET /api/health`
- Frontend: `GET /health`
- Database: `GET /api/db/health`
- Redis: `GET /api/cache/health`

### Support Contacts
- **DevOps Team**: devops@sportbet.com
- **Security Team**: security@sportbet.com
- **On-call Engineer**: +1-XXX-XXX-XXXX

### Emergency Procedures
1. **Critical Security Issue**: Immediately scale down to maintenance mode
2. **Data Breach**: Follow incident response plan, notify authorities
3. **Payment System Failure**: Disable transactions, notify payment provider
4. **Total System Failure**: Activate disaster recovery plan

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Next Review**: March 2024
