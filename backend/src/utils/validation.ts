import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FastifyReply } from 'fastify';

export async function validateDto<T extends object>(
  dtoClass: new () => T,
  data: any,
  reply: FastifyReply
): Promise<T | null> {
  const dtoInstance = plainToInstance(dtoClass, data);
  const errors = await validate(dtoInstance);

  if (errors.length > 0) {
    const formattedErrors = errors.map((error: ValidationError) => ({
      field: error.property,
      errors: Object.values(error.constraints || {}),
    }));

    reply.code(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: formattedErrors,
    });

    return null;
  }

  return dtoInstance;
}
