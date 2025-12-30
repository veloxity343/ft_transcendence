/**
 * Authentication Routes
 * Handles user registration, login, logout, token refresh, and 2FA
 */
import { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../services/auth.service';
import { TwoFactorService } from '../services/twofa.service';
import { SignUpDto, SignInDto, TwoFactorDto, VerifyTwoFactorDto } from '../dto/auth.dto';
import { validateDto } from '../utils/validation';
import { authenticate, getUserId } from '../middleware/auth.middleware';
import { config } from '../config/config';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);
  const twoFAService = new TwoFactorService(fastify.prisma);

  // Sign Up
  fastify.post('/signup', async (request, reply) => {
    const dto = await validateDto(SignUpDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await authService.signup(dto.email, dto.username, dto.password);

      const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: false },
        { expiresIn: config.jwt.accessExpiration }
      );

      const refreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: false },
        { expiresIn: config.jwt.refreshExpiration }
      );

      await authService.updateRefreshToken(user.id, refreshToken);

      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      reply.code(403).send({ 
        statusCode: 403,
        error: 'Forbidden',
        message: error.message 
      });
    }
  });

  // Sign In
  fastify.post('/signin', async (request, reply) => {
    const dto = await validateDto(SignInDto, request.body, reply);
    if (!dto) return;

    try {
      const result = await authService.signin(dto.username, dto.password);

      if ('requires2FA' in result) {
        return reply.send(result);
      }

      const accessToken = fastify.jwt.sign(
        { sub: result.id, email: result.email, is2FA: false },
        { expiresIn: config.jwt.accessExpiration }
      );

      const refreshToken = fastify.jwt.sign(
        { sub: result.id, email: result.email, is2FA: false },
        { expiresIn: config.jwt.refreshExpiration }
      );

      await authService.updateRefreshToken(result.id, refreshToken);

      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      reply.code(403).send({ 
        statusCode: 403,
        error: 'Forbidden',
        message: error.message 
      });
    }
  });

  // Sign Out
  fastify.post('/signout', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    await authService.signout(userId);
    
    reply.send({ message: 'Signed out successfully' });
  });

  // Refresh Token
  fastify.post('/refresh', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ error: 'No token provided' });
    }

    const refreshToken = authHeader.replace('Bearer ', '');

    try {
      const decoded = fastify.jwt.verify(refreshToken) as any;
      const user = await authService.refreshTokens(decoded.sub, refreshToken);

      const newAccessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: user.twoFA },
        { expiresIn: config.jwt.accessExpiration }
      );

      const newRefreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: user.twoFA },
        { expiresIn: config.jwt.refreshExpiration }
      );

      await authService.updateRefreshToken(user.id, newRefreshToken);

      reply.send({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      });
    } catch (error: any) {
      reply.code(403).send({ error: error.message });
    }
  });

  // Get Current User
  fastify.get('/me', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Remove sensitive data
    const { hash, hashedRtoken, twoFAsecret, ...safeUser } = user;

    reply.send(safeUser);
  });

  // 2FA Routes
  fastify.get('/2fa/generate', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    const { otpauthUrl } = await twoFAService.generate2FA(userId);
    const qrCode = await twoFAService.generateQRCode(otpauthUrl);
    
    reply.send({ qrCode });
  });

  fastify.post('/2fa/turn-on', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    const dto = await validateDto(VerifyTwoFactorDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await twoFAService.turnOn2FA(userId, dto.twoFAcode);

      const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: true },
        { expiresIn: config.jwt.accessExpiration }
      );

      const refreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: true },
        { expiresIn: config.jwt.refreshExpiration }
      );

      await authService.updateRefreshToken(user.id, refreshToken);

      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      reply.code(401).send({ error: error.message });
    }
  });

  fastify.post('/2fa/turn-off', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const userId = getUserId(request);
    
    await twoFAService.turnOff2FA(userId);

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const accessToken = fastify.jwt.sign(
      { sub: user.id, email: user.email, is2FA: false },
      { expiresIn: config.jwt.accessExpiration }
    );

    const refreshToken = fastify.jwt.sign(
      { sub: user.id, email: user.email, is2FA: false },
      { expiresIn: config.jwt.refreshExpiration }
    );

    await authService.updateRefreshToken(user.id, refreshToken);

    reply.send({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  });

  fastify.post('/2fa/authenticate', async (request, reply) => {
    const dto = await validateDto(TwoFactorDto, request.body, reply);
    if (!dto) return;

    try {
      const user = await twoFAService.authenticate2FA(dto.username, dto.twoFAcode);

      const accessToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: true },
        { expiresIn: config.jwt.accessExpiration }
      );

      const refreshToken = fastify.jwt.sign(
        { sub: user.id, email: user.email, is2FA: true },
        { expiresIn: config.jwt.refreshExpiration }
      );

      await authService.updateRefreshToken(user.id, refreshToken);

      reply.send({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      reply.code(401).send({ error: error.message });
    }
  });
};

export default authRoutes;
export const autoPrefix = '/auth';
