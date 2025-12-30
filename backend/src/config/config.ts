import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

// load ssl certs
const loadSSLCerts = () => {
  // in docker: /app/ssl, in dev: ./ssl
  const sslDir = process.env.SSL_DIR || join(__dirname, '..', '..', 'ssl');
  const keyPath = process.env.SSL_KEY_PATH || join(sslDir, 'key.pem');
  const certPath = process.env.SSL_CERT_PATH || join(sslDir, 'cert.pem');
  
  try {
    return {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    };
  } catch (err) {
    console.error('Failed to load SSL certificates from:', keyPath, certPath);
    console.error(err);
    process.exit(1);
  }
};

const useSSL = process.env.USE_SSL === 'true' || process.env.ENVIRONMENT === 'PRODUCTION';

export const config = {
  environment: process.env.ENVIRONMENT || 'DEVELOPMENT',
  port: parseInt(process.env.BACK_PORT || '3000', 10),
  frontUrl: process.env.FRONT_URL || 'http://localhost:5173',
  siteUrl: process.env.SITE_URL || 'https://localhost',
  frontPort: process.env.FRONT_PORT || '5173',

  trustProxy: process.env.TRUST_PROXY === 'true',
  
  // ssl config
  useSSL,
  ssl: useSSL ? loadSSLCerts() : null,
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessExpiration: process.env.ACCESS_TOKEN_EXPIRATION || '15m',
    refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  },
  
  oauth42: {
    clientId: process.env.FORTYTWO_ID || '',
    clientSecret: process.env.FORTYTWO_SECRET || '',
    callbackUrl: process.env.FORTYTWO_CALLBACK || '',
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'https://localhost:3000/oauth/google/callback',
  },
  
  twoFA: {
    appName: process.env.MY_2FA_APP_NAME || 'Transcendence',
  },
  
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  defaultAvatar: process.env.DEFAULT_AVATAR || 'default-avatar.png',
  
  game: {
    refreshRate: 10,
    paddleSpeed: 1,
    ballSpeed: 0.25,
    winScore: 11,
  },
};
