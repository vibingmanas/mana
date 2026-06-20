import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsIn, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { InspectionJobStatus, InspectionType, UserRole } from '@mana/db';
import { InspectionsService } from './inspections.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class RunInspectionDto {
  @IsIn(Object.values(InspectionType)) type!: InspectionType;
  @IsOptional() @IsObject() sectionScores?: Record<string, number>;
}

class RequestInspectionDto {
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() @Length(2, 200) location?: string;
  @IsOptional() @IsString() @Length(2, 500) notes?: string;
}

class AssignJobDto {
  @IsString() inspectorId!: string;
  @IsOptional() @IsString() scheduledAt?: string;
}

class SubmitPhysicalDto {
  @IsObject() sectionScores!: Record<string, number>;
  @IsOptional() @IsInt() @Min(0) @Max(2_000_000) odometerKm?: number;
  @IsOptional() @IsString() @Length(2, 1000) notes?: string;
  @IsOptional() @IsString() @Length(4, 100) clientRef?: string;
}

@Controller('vehicles/:vehicleId')
export class InspectionsController {
  constructor(private readonly inspections: InspectionsService) {}

  // Public trust summary for a listing.
  @Get('trust')
  trust(@Param('vehicleId') vehicleId: string) {
    return this.inspections.getForVehicle(vehicleId);
  }

  // Public full vehicle-history report.
  @Get('history')
  history(@Param('vehicleId') vehicleId: string) {
    return this.inspections.vehicleHistory(vehicleId);
  }

  // Dealer requests a physical inspection of their vehicle.
  @Post('inspection-request')
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER_OWNER)
  request(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: RequestInspectionDto,
  ) {
    return this.inspections.requestPhysical(user.userId, vehicleId, dto);
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

// Inspector field-app + admin scheduling endpoints.
@Controller('inspections')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InspectionJobsController {
  constructor(private readonly inspections: InspectionsService) {}

  // ── Inspector worklist (offline app syncs from here) ──
  @Get('jobs')
  @Roles(UserRole.INSPECTOR)
  myJobs(@CurrentUser() user: AuthUser, @Query('status') status?: InspectionJobStatus) {
    return this.inspections.listJobsForInspector(user.userId, status);
  }

  @Post('jobs/:id/start')
  @HttpCode(200)
  @Roles(UserRole.INSPECTOR)
  start(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.inspections.startJob(user.userId, id);
  }

  @Post('jobs/:id/submit')
  @HttpCode(200)
  @Roles(UserRole.INSPECTOR)
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitPhysicalDto) {
    return this.inspections.submitPhysical(user.userId, id, dto);
  }

  // ── Admin scheduling ──
  @Get('admin/jobs')
  @Roles(UserRole.ADMIN)
  adminJobs(@Query('status') status?: InspectionJobStatus) {
    return this.inspections.listJobsForAdmin(status);
  }

  @Post('jobs/:id/assign')
  @HttpCode(200)
  @Roles(UserRole.ADMIN)
  assign(@Param('id') id: string, @Body() dto: AssignJobDto) {
    return this.inspections.assign(id, dto.inspectorId, dto.scheduledAt);
  }
}
