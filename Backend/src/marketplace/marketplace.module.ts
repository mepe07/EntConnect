// Ficheiro: Backend/src/marketplace/marketplace.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
    imports: [AuthModule],
    controllers: [MarketplaceController],
    providers: [MarketplaceService],
})
export class MarketplaceModule {
} 