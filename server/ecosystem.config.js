module.exports = {
  apps: [
    {
      name: 'sportbet-api',
      script: 'dist/main.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Performance optimizations
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size',
        '--gc-interval=100'
      ],
      // Memory management
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // Environment variables for production optimization
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Disable unnecessary logging in production
        DEBUG: '',
        // MongoDB connection pooling
        MONGODB_MAX_POOL_SIZE: '10',
        MONGODB_MIN_POOL_SIZE: '2',
        // Redis optimizations
        REDIS_MAXMEMORY_POLICY: 'allkeys-lru',
        // Node.js optimizations
        UV_THREADPOOL_SIZE: '4',
      }
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:username/sportbet.git',
      path: '/var/www/sportbet',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
