import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });  //instantiate app + enabling CORS
  // app.enableCors();

  await app.listen(4000); //launch server
}
bootstrap();
