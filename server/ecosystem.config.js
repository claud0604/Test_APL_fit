/**
 * PM2 설정 파일
 * Oracle Cloud VM에서 테스트/프로덕션 서버 관리용
 */

module.exports = {
  apps: [
    {
      name: 'apl-fit-test',
      script: './server.js',
      env: {
        NODE_ENV: 'test'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '../logs/test-error.log',
      out_file: '../logs/test-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'apl-fit-prod',
      script: './server.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: '../logs/prod-error.log',
      out_file: '../logs/prod-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
