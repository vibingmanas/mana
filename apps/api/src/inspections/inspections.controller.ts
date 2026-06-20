import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import { InspectionType, UserRole } from '@mana/db';
import { InspectionsService } from './inspections.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class RunInspectionDto {
  @IsIn(Object.values(InspectionType)) type!: InspectionType;
  @IsOptional() @IsObject() sectionScores?: Record<string, number>;
}

@Controller('vehicles/:vehicleId')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  // Public trust summary for a listing.
  @Get('trust')
  trust(@Param('vehicleId') vehicleId: string) {
    return this.inspections.getForVehicle(vehicleId);
  }

  @Post('odometer-check')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  odometer(@CurrentUser() user: AuthUser, @Param('vehicleId') vehicleId: string) {
    return this.inspections.runOdometerCheck(user.userId, vehicleId);
  }

  @Post('inspect')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  inspect(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RunInspectionDto,
  ) {
    return this.inspections.runInspection(user.userId, vehicleId, dto.type, dto.sectionScores);
  }
}
