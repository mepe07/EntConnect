// Ficheiro: src/marketplace/marketplace.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

/**
 * MarketplaceModule
 *
 * Módulo responsável por agrupar tudo o que pertence ao domínio Marketplace.
 *
 * Neste módulo ficam registados:
 * - MarketplaceController: expõe as rotas HTTP;
 * - MarketplaceService: contém a orquestração principal das regras de negócio;
 * - AuthModule: disponibiliza AuthGuard, RolesGuard e dependências de autenticação.
 *
 * Este módulo cobre:
 * - anúncios do Marketplace;
 * - moderação;
 * - interesses em anúncios;
 * - inventário escolar.
 */
@Module({
    imports: [AuthModule],
    controllers: [MarketplaceController],
    providers: [MarketplaceService],
})
export class MarketplaceModule {
} 