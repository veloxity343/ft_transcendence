import { FastifyPluginAsync } from 'fastify';
import { OAuthService } from '../services/oauth.service';
import { AuthService } from '../services/auth.service';
import { config } from '../config/config';

const oauthRoutes: FastifyPluginAsync = async (fastify) => {
  const oauthService = new OAuthService(fastify.prisma);
  const authService = new AuthService(fastify.prisma);

  // ==================== GOOGLE OAUTH ====================

  /**
   * GET /oauth/google
   * Redirect user to Google's OAuth consent screen
   */
  fastify.get('/google', async (request, reply) => {
    const authUrl = oauthService.getGoogleAuthUrl();
    return reply.redirect(authUrl);
  });

  /**
   * GET /oauth/google/callback
   * Handle the OAuth callback from Google
   */
  fastify.get('/google/callback', async (request, reply) => {
    const { code, error } = request.query as { code?: string; error?: string };

    if (error) {
        return reply.redirect(`${config.frontUrl}/login?error=oauth_denied`);
    }

    if (!code) {
        return reply.redirect(`${config.frontUrl}/login?error=no_code`);
    }

    try {
        const { user, isNewUser } = await oauthService.handleGoogleCallback(code);

        // Check if user has 2FA enabled
        if (user.twoFA) {
        return reply.redirect(
            `${config.frontUrl}/login?requires2FA=true&username=${encodeURIComponent(user.username)}`
        );
        }

        // Generate JWT tokens
        const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: false },
        { expiresIn: config.jwt.accessExpiration }
        );

        const refreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: false },
        { expiresIn: config.jwt.refreshExpiration }
        );

        // Store refresh token hash
        await authService.updateRefreshToken(user.id, refreshToken);

        // Build redirect URL with tokens as query params
        const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        is_new_user: isNewUser.toString(),
        });

        const redirectUrl = `${config.frontUrl}/oauth/callback?${params.toString()}`;
        
        console.log('Redirecting with tokens to:', redirectUrl);

        return reply.redirect(redirectUrl);
    } catch (err: any) {
        fastify.log.error({ err }, 'Google OAuth callback error');
        return reply.redirect(
        `${config.frontUrl}/login?error=${encodeURIComponent(err.message)}`
        );
    }
    });

  /**
   * GET /oauth/google/url
   * Get the Google OAuth URL (for SPA flow)
   */
  fastify.get('/google/url', async (request, reply) => {
    const authUrl = oauthService.getGoogleAuthUrl();
    return reply.send({ url: authUrl });
  });

  // ==================== CHECK OAUTH STATUS ====================

  /**
   * GET /oauth/status
   * Check if OAuth providers are configured
   */
  fastify.get('/status', async (request, reply) => {
    return reply.send({
      google: {
        enabled: !!(config.google.clientId && config.google.clientSecret),
      },
      // Add other OAuth providers here as needed
    });
  });
};

export default oauthRoutes;
export const autoPrefix = '/oauth';
