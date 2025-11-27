import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { envs } from './config';
import { RpcToHttpExceptionFilter } from './common/filters/rpc-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const { port, nodeEnv } = envs;
  const logger = new Logger('Gateway');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for web/frontend using ALLOWED_ORIGINS (comma-separated)
  app.enableCors({
    origin: envs.allowedOrigins.length ? envs.allowedOrigins : true,
    credentials: true,
  });
  app.use(helmet());
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('Libreta Sanitaria Mascotas API')
    .setDescription('API for managing pet health records')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(port);
  logger.log(`🚀 Gateway is running in port ${port} in mode ${nodeEnv}`);
}
bootstrap();
