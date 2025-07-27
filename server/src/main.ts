import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import * as compression from 'compression'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  // Configure NestJS with production optimizations
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn'] 
      : ['log', 'error', 'warn', 'debug', 'verbose'],
    abortOnError: false,
  })
  
  const configService = app.get(ConfigService)

  // Enhanced security middleware with optimized headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false, // Disable CSP in development for easier debugging
    crossOriginEmbedderPolicy: false, // Less restrictive for development
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false, // Disable HSTS in development
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
  }))

  // Optimized security headers middleware
  app.use((req, res, next) => {
    // Only set essential headers in development
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('Referrer-Policy', 'no-referrer')
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
    
    // Remove server information
    res.removeHeader('X-Powered-By')
    res.removeHeader('Server')
    
    next()
  })

  // Optimized compression
  app.use(compression({
    level: process.env.NODE_ENV === 'production' ? 6 : 1, // Lower compression in dev
    threshold: 1024, // Only compress files larger than 1KB
  }))
  
  app.use(cookieParser())

  // Conditional load balancing service
  if (process.env.NODE_ENV === 'production') {
    try {
      const { LoadBalancingService } = await import('./modules/monitoring/load-balancing.service');
      const loadBalancingService = app.get(LoadBalancingService, { strict: false });
      
      if (loadBalancingService) {
        app.use((req, res, next) => {
          const canAccept = loadBalancingService.registerConnection(req, res);
          if (canAccept) {
            next();
          }
        });
        console.log('✅ Load balancing middleware enabled');
      }
    } catch (error) {
      console.log('⚠️  Load balancing service not available, continuing without it');
    }
  }

  // CORS configuration with enhanced security
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        configService.get('CLIENT_URL', 'http://localhost:5173'),
        'http://localhost:3000',
        'http://localhost:5173'
      ]
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true)
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'X-CSRF-Token',
      'X-Requested-With'
    ],
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
  })

  // Enhanced global validation pipe with security
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
      stopAtFirstError: true,
    }),
  )

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter())

  // API prefix
  app.setGlobalPrefix('api')

  // HTTPS enforcement in production
  if (configService.get('NODE_ENV') === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`)
      } else {
        next()
      }
    })
  }

  const port = configService.get('PORT', 3000)
  await app.listen(port)
  
  console.log(`🚀 Server running on http://localhost:${port}`)
  console.log(`📚 API documentation available at http://localhost:${port}/api`)
  console.log(`🔧 Health check available at http://localhost:${port}/api/health`)
  console.log(`📊 Monitoring dashboard at http://localhost:${port}/api/monitoring/dashboard`)
  console.log(`🔒 Security module enabled with comprehensive protection`)
}

bootstrap()