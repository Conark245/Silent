module.exports = {
  apps: [
    {
      name: 'donation-live-app',
      script: './dist/server.cjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
