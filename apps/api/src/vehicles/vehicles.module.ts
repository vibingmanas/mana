import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { ListingsController } from './listings.controller';

@Module({
  controllers: [VehiclesController, ListingsController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
