import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // Habilita CORS para permitir requisições de outros domínios (útil para frontend)

  // 1. Criar a configuração base do Swagger
  const config = new DocumentBuilder()
    .setTitle('API EntConnect') // O nome do vosso projeto
    .setDescription('Documentação oficial da API para o projeto de PDS')
    .setVersion('1.0')
    // .addBearerAuth() // <-- Descomenta isto mais tarde quando tiverem login/tokens JWT!
    .build();

  // 2. Gerar o documento
  const document = SwaggerModule.createDocument(app, config);

  // 3. Montar o Swagger na rota '/api-docs'
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();