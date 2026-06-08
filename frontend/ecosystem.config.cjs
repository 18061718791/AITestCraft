module.exports = {
  apps: [
    {
      name: 'aitestcraft-frontend',
      // 使用 vite preview 运行生产构建（稳定环境，端口 5175）
      script: 'node',
      args: './node_modules/vite/bin/vite.js preview --port 5175 --host 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: ''
      },
      env_production: {
        NODE_ENV: 'production',
        VITE_API_URL: ''
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      exec_mode: 'fork',
      kill_timeout: 5000,
      listen_timeout: 10000
    }
  ]
};
