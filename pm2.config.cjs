module.exports = {
  apps: [
    {
      name: "kpop-tracker",
      script: "server.cjs",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
