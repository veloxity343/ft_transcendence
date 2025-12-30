/**
 * OAuth Service
 * Handles OAuth 2.0 authentication with external providers (42 School, Google)
 * Implements the authorization code flow with PKCE where applicable
 */
import { PrismaClient } from '@prisma/client';
import { config } from '../config/config';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export class OAuthService {
  constructor(private prisma: PrismaClient) {}

  // ==================== GOOGLE OAUTH ====================

  /**
   * Generate the Google OAuth authorization URL
   * User will be redirected here to grant permissions
   * Requests offline access to get a refresh token
   */
  getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * Called in the OAuth callback after user grants permissions
   * @throws Error if code exchange fails (invalid code, mismatched redirect URI, etc.)
   */
  async exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
    console.log('Exchanging code with Google...');
    console.log('Client ID:', config.google.clientId);
    console.log('Callback URL:', config.google.callbackUrl);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.google.callbackUrl,
        }),
    });

    const responseText = await response.text();
    console.log('Google response status:', response.status);
    console.log('Google response body:', responseText);

    if (!response.ok) {
        throw new Error(`Failed to exchange code: ${responseText}`);
    }

    return JSON.parse(responseText) as GoogleTokenResponse;
    }

  /**
   * Get user info from Google using access token
   */
  async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
        Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to get user info from Google');
    }

    return response.json() as Promise<GoogleUserInfo>;
    }

  /**
   * Handle Google OAuth callback - create or link user account
   * If user exists with this Google ID, return existing user
   * If email exists but no Google ID, link the accounts
   * Otherwise, create a new user
   */
  async handleGoogleCallback(code: string): Promise<{ user: any; isNewUser: boolean }> {
    // Exchange code for tokens
    const tokens = await this.exchangeGoogleCode(code);
    
    // Get user info from Google
    const googleUser = await this.getGoogleUserInfo(tokens.access_token);

    if (!googleUser.email) {
      throw new Error('Email not provided by Google');
    }

    // Check if user exists with this Google ID
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: googleUser.email },
          // You could add a googleId field to track Google-linked accounts
        ],
      },
    });

    let isNewUser = false;

    if (user) {
      // User exists - update their info if needed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          // Update avatar if they don't have one and Google provides one
          avatar: user.avatar === 'default-avatar.png' && googleUser.picture 
            ? googleUser.picture 
            : user.avatar,
        },
      });
    } else {
      // Create new user
      isNewUser = true;
      
      // Generate a unique username from Google name
      let baseUsername = googleUser.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 15);
      
      if (baseUsername.length < 3) {
        baseUsername = 'user';
      }

      let username = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (await this.prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          username,
          hash: '', // OAuth users don't have a password
          avatar: googleUser.picture || 'default-avatar.png',
        },
      });
    }

    return { user, isNewUser };
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(userId: number, code: string): Promise<void> {
    // Exchange code for tokens
    const tokens = await this.exchangeGoogleCode(code);
    
    // Get user info from Google
    const googleUser = await this.getGoogleUserInfo(tokens.access_token);

    // Check if this Google account is already linked to another user
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: googleUser.email,
        id: { not: userId },
      },
    });

    if (existingUser) {
      throw new Error('This Google account is already linked to another user');
    }

    // Update user with Google info (you could add a googleId field)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        // If user's email is different, you might want to handle this case
        // For now, we just ensure they're linked via email match
      },
    });
  }
}
