import { Module } from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { AuctionsController, AdminAuctionsController } from './auctions.controller';

@Module({
  controllers: [AuctionsController, AdminAuctionsController],
  providers: [AuctionsService],
})
export class AuctionsModule {}
