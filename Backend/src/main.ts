import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para permitir requisições de outros domínios (útil para frontend)
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4200'], // Ajustar para o Frontend
    credentials: true,
  });

  // ATIVAR A VALIDAÇÃO GLOBAL
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove campos extra que o Frontend envie e que não estejam no DTO
      forbidNonWhitelisted: true, // Dá Erro 400 se o Frontend tentar enviar lixo/campos não permitidos
      transform: true, // Converte automaticamente strings do URL para números/booleanos no teu código
    }),
  );

  // Criar a configuração base do Swagger
  const config = new DocumentBuilder()
    .setTitle('API EntConnect') // O nome do vosso projeto
    .setDescription('Documentação oficial da API para o projeto EntConnect') // Uma breve descrição do que a API faz
    .setVersion('1.0')
    // .addBearerAuth() // <-- Descomenta isto mais tarde quando tiverem login/tokens JWT!
    .build();

  // Gerar o documento
  const document = SwaggerModule.createDocument(app, config);

  // Montar o Swagger na rota '/api-docs'
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();