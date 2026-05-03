module.exports = {
  apps: [
    {
      name: 'wez-api',
      cwd: './apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        API_PORT: 3005,
        API_HOST: '127.0.0.1',
      },
      env_development: {
        NODE_ENV: 'development',
        API_PORT: 3005,
        API_HOST: '0.0.0.0',
      },
      max_memory_restart: '512M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
