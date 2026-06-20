import { Global, Module } from '@nestjs/common';
import { DealersService } from './dealers.service';

@Global()
@Module({
  providers: [DealersService],
  exports: [DealersService],
})
export class DealersModule {}
