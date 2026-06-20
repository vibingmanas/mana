import { Global, Module } from '@nestjs/common';
import { BlocklistService } from './blocklist.service';
import { FeatureFlagsService } from './feature-flags.service';
import { DisputesService } from './disputes.service';
import { ModerationPublicController } from './moderation.controller';

@Global()
@Module({
  controllers: [ModerationPublicController],
  providers: [BlocklistService, FeatureFlagsService, DisputesService],
  exports: [BlocklistService, FeatureFlagsService, DisputesService],
})
export class ModerationModule {}
