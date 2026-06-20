import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  BuyerAppointmentsController,
  CancelAppointmentController,
  DealerAppointmentsController,
  PublicAvailabilityController,
} from './appointments.controller';

@Module({
  controllers: [
    PublicAvailabilityController,
    DealerAppointmentsController,
    BuyerAppointmentsController,
    CancelAppointmentController,
  ],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
