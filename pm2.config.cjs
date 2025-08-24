module.exports = {
  apps: [
    {
      name: "kpop-tracker",
      script: "server.cjs",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production"
      },
      env_file: ".env"  // This tells PM2 to load variables from .env file
    },
  ],
};
