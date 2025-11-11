export default () => ({
  environment: process.env.ENVIRONMENT ?? 'DEVELOPMENT',
  port: parseInt(process.env.BACK_PORT ?? '3000', 10),

  frontUrl: process.env.FRONT_URL ?? 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    accessExpiration: process.env.ACCESS_TOKEN_EXPIRATION ?? '15m',
    refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION ?? '7d',
  },

  oauth42: {
    clientId: process.env.FORTYTWO_ID ?? '',
    clientSecret: process.env.FORTYTWO_SECRET ?? '',
    callbackUrl: process.env.FORTYTWO_CALLBACK ?? '',
  },

  twoFA: {
    appName: process.env.MY_2FA_APP_NAME ?? 'ft_transcendence',
  },

  upload: {
    directory: process.env.UPLOAD_DIR ?? './uploads',
    maxSize: 1000000,
    defaultAvatar: process.env.DEFAULT_AVATAR ?? '',
  },

  game: {
    refreshRate: 10,
    paddleSpeed: 1,
    ballSpeed: 0.25,
    winScore: 11,
  },
});
