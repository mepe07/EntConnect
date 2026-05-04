import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
/**
 * Modulo responsavel por agrupar os recursos de Marketplace.
 */

@Module({
  imports: [AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
