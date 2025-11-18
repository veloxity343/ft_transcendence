import { FastifyRequest, FastifyReply } from 'fastify';

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

// Helper to get user ID from JWT
export function getUserId(request: FastifyRequest): number {
  const user = request.user as any;
  return user?.sub || user?.id;
}
