import { Module } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { InspectionsController, InspectionJobsController } from './inspections.controller';

@Module({
  controllers: [InspectionsController, InspectionJobsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
