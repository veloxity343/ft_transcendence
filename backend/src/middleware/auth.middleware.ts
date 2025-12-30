/**
 * Authentication middleware
 * Provides JWT token verification and user identification utilities
 */
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Requires valid JWT token in request
 * Returns 401 Unauthorized if token is missing, expired, or invalid
 * Token should be in Authorization header as "Bearer <token>"
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ 
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or missing token'
    });
  }
}

/**
 * Attempts to verify JWT token but continues if token is missing or invalid
 * Useful for endpoints that have different behavior for authenticated vs anonymous users
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    // Continue without authentication
  }
}

/**
 * Extracts user ID from verified JWT token
 * Must be called after authenticate middleware
 * @returns User ID from token payload (sub claim)
 */
export function getUserId(request: FastifyRequest): number {
  const user = request.user as any;
  return user?.sub || user?.id;
}
