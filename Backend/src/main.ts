// Ficheiro: src/main.ts

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';

import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Permite aceder às variáveis configuradas no ficheiro .env.
    const configService = app.get(ConfigService);

    // URL do frontend autorizada a fazer pedidos ao backend.
    // Em desenvolvimento: http://localhost:5173
    // Em produção: alteras apenas no .env, sem mexer no código.
    const frontendUrl =
        configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';

    const allowedOrigins = new Set([
        frontendUrl,
        'http://localhost:4200',
        'http://localhost:5173',
    ]);

    // CORS permite que o frontend consiga comunicar com o backend.
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

    // Validação global dos DTOs.
    // Isto ajuda a proteger a API contra dados extra ou mal formatados.
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Remove campos que não existem no DTO.
            forbidNonWhitelisted: true, // Dá erro 400 se vierem campos não permitidos.
            transform: true, // Converte automaticamente strings para number/boolean quando possível.
        }),
    );

    // Configuração da documentação Swagger.
    const swaggerConfig = new DocumentBuilder()
        .setTitle('API EntConnect')
        .setDescription('Documentação oficial da API para o projeto EntConnect')
        .setVersion('1.0')
        .addBearerAuth() // Permite testar endpoints protegidos com JWT no Swagger.
        .build();

    // Cria o documento Swagger com base nos controllers da aplicação.
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    // Disponibiliza o Swagger na rota /api-docs.
    SwaggerModule.setup('api-docs', app, swaggerDocument);

    // Porta onde o backend vai correr.
    // Vem do .env, mas se faltar ou estiver inválida, usa 3000.
    const portFromEnv = Number(configService.get<string>('PORT') ?? '3000');
    const port = Number.isNaN(portFromEnv) ? 3000 : portFromEnv;

    await app.listen(port);

    console.log(`API EntConnect a correr em: http://localhost:${port}`);
    console.log(`Swagger disponível em: http://localhost:${port}/api-docs`);
}

bootstrap();
