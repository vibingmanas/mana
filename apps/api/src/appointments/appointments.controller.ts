import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentType, UserRole } from '@mana/db';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto, CompleteAppointmentDto, SetAvailabilityDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

/** Public: a dealer's availability + open slots for a date. */
@Controller('dealers/:dealerId/availability')
export class PublicAvailabilityController {
  constructor(private readonly appts: AppointmentsService) {}

  @Get()
  windows(@Param('dealerId') dealerId: string) {
    return this.appts.getAvailabilityByDealer(dealerId);
  }

  @Get('slots')
  slots(@Param('dealerId') dealerId: string, @Query('date') date: string) {
    return this.appts.openSlots(dealerId, date);
  }
}

/** Dealer-managed availability + appointment actions. */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEALER_OWNER)
export class DealerAppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  @Put('dealer/availability')
  setAvailability(@CurrentUser() user: AuthUser, @Body() dto: SetAvailabilityDto) {
    return this.appts.setAvailability(user.userId, dto.windows);
  }

  @Get('dealer/appointments')
  list(@CurrentUser() user: AuthUser) {
    return this.appts.listForDealer(user.userId);
  }

  @Post('appointments/:id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appts.confirm(user.userId, id);
  }

  @Post('appointments/:id/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CompleteAppointmentDto,
  ) {
    return this.appts.complete(user.userId, id, dto.showed, dto.outcome);
  }
}

/** Buyer booking. */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER)
export class BuyerAppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  @Post('appointments')
  @HttpCode(201)
  book(@CurrentUser() user: AuthUser, @Body() dto: BookAppointmentDto) {
    return this.appts.book(
      user.userId,
      dto.vehicleId,
      dto.type ?? AppointmentType.AT_DEALER,
      dto.scheduledStart,
      dto.location,
    );
  }

  @Get('buyer/appointments')
  list(@CurrentUser() user: AuthUser) {
    return this.appts.listForBuyer(user.userId);
  }
}

/** Cancel — either the booking buyer or the owning dealer. */
@Controller()
@UseGuards(JwtAuthGuard)
export class CancelAppointmentController {
  constructor(private readonly appts: AppointmentsService) {}

  @Post('appointments/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.appts.cancel(user.userId, user.role, id);
  }
}
