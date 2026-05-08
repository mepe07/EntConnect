import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common'; // Adicionei o Logger aqui
import * as appInsights from 'applicationinsights';
import { AppInsightsLogger } from './utils/logger/app-insights.logger';
import { AppModule } from './app.module';

/**
 * Inicialização serviço Azure App Insights
 */
// NOTA: Se testares localmente e a variável der undefined, pode ser necessário 
// adicionar require('dotenv').config(); no topo do ficheiro para ler o .env antes do NestJS arrancar.
const appInsightsConnectionString = process.env.APPINSIGHTS_CONNECTION_STRING;

if (appInsightsConnectionString) {
  appInsights.setup(appInsightsConnectionString)
    .setAutoDependencyCorrelation(true) // Rastreia chamadas à Base de Dados e Blobs
    .setAutoCollectRequests(true)       // Rastreia endpoints (GET, POST, etc.)
    .setAutoCollectExceptions(true)     // Apanha erros não tratados
    .setAutoCollectDependencies(true)   // Rastreia chamadas a APIs externas
    .setAutoCollectConsole(false)       // Desativado para evitar spam de objetos do NestJS
    .setSendLiveMetrics(true)           // Permite ver gráficos em tempo real no portal
    .start();
    
  console.log('Azure Application Insights iniciado com sucesso.');
}

/**
 * Inicializa a aplicacao NestJS.
 * @returns Resultado da operacao.
 */
async function bootstrap() {
  // Substituír o logger padrão do NestJS pelo AppInsightsLogger personalizado
  const app = await NestFactory.create(AppModule, {
    logger: new AppInsightsLogger(),
  });

  const configService = app.get(ConfigService);

  const frontendUrl = configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';

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

  // Usar o Logger do NestJS em vez de console.log para que vá para o Azure
  Logger.log(`API EntConnect a correr em: http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger disponível em: http://localhost:${port}/api-docs`, 'Bootstrap');
}

bootstrap();