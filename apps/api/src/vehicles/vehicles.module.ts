import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { ListingsController } from './listings.controller';
import { MediaUploadService } from './media-upload.service';

@Module({
  controllers: [VehiclesController, ListingsController],
  providers: [VehiclesService, MediaUploadService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
