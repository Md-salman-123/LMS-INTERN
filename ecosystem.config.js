// PM2 Ecosystem file for production deployment
module.exports = {
  apps: [
    {
      name: 'lms-backend',
      script: './src/server.js',
      instances: 2, // Use cluster mode for better performance
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false,
    },
  ],
};


