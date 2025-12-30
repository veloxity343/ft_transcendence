/**
 * Application configuration module
 * Loads and validates environment variables and SSL certificates for the application
 */
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

/**
 * Loads SSL certificate files from the filesystem
 * Paths are configurable via environment variables to support both Docker and local development
 * @returns Object containing key and certificate buffers
 * @throws Process exits if certificates cannot be loaded when SSL is required
 */
const loadSSLCerts = () => {
  // Docker uses /app/ssl, local development uses ./ssl
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

// SSL is required in production, optional in development
const useSSL = process.env.USE_SSL === 'true' || process.env.ENVIRONMENT === 'PRODUCTION';

/**
 * Central application configuration
 * All environment variables are loaded and typed here for type safety throughout the app
 */
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
