module.exports = {
  apps: [
    {
      name: 'donation-live-app',
      script: './dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
