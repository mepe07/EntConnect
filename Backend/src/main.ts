import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

import { AppModule } from './app.module';

/**
 * Inicializa a aplicacao NestJS.
 * @returns Resultado da operacao.
 */

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';

  const allowedOrigins = new Set([
    frontendUrl,
    'http://localhost:4200',
    'http://localhost:5173',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API EntConnect')
    .setDescription('Documentação oficial da API para o projeto EntConnect')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api-docs', app, swaggerDocument);

  const portFromEnv = Number(configService.get<string>('PORT') ?? '3000');
  const port = Number.isNaN(portFromEnv) ? 3000 : portFromEnv;

  await app.listen(port);

  console.log(`API EntConnect a correr em: http://localhost:${port}`);
  console.log(`Swagger disponível em: http://localhost:${port}/api-docs`);
}

bootstrap();
