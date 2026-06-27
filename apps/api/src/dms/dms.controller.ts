import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { DealerStaffRole, LeadStatus, SyndicationChannel, UserRole } from '@mana/db';
import { DmsService, type BulkRow } from './dms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class UpdateLeadDto {
  @IsOptional() @IsIn(Object.values(LeadStatus)) status?: LeadStatus;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}

class AddStaffDto {
  @IsString() @Length(8, 20) phone!: string;
  @IsIn(Object.values(DealerStaffRole)) role!: DealerStaffRole;
}

class BulkUploadDto {
  @IsArray() rows!: BulkRow[];
}

class BulkCsvDto {
  @IsString() @Length(1, 500_000) csv!: string;
}

class SetSyndicationDto {
  @IsBoolean() enabled!: boolean;
}

@Controller('dealer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEALER_OWNER)
export class DmsController {
  constructor(private readonly dms: DmsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.dms.dashboard(user.userId);
  }

  @Get('leads')
  leads(@CurrentUser() user: AuthUser, @Query('status') status?: LeadStatus) {
    return this.dms.listLeads(user.userId, status);
  }

  @Patch('leads/:id')
  updateLead(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.dms.updateLead(user.userId, id, dto);
  }

  // ── Market intelligence + boost ──
  @Get('intelligence')
  intelligence(@CurrentUser() user: AuthUser) {
    return this.dms.intelligence(user.userId);
  }

  @Post('cars/:id/boost')
  @HttpCode(200)
  boost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dms.boostListing(user.userId, id);
  }

  // ── Staff roster (owner-only, enforced in service) ──
  @Get('staff')
  listStaff(@CurrentUser() user: AuthUser) {
    return this.dms.listStaff(user.userId);
  }

  @Post('staff')
  @HttpCode(201)
  addStaff(@CurrentUser() user: AuthUser, @Body() dto: AddStaffDto) {
    return this.dms.addStaff(user.userId, dto.phone, dto.role);
  }

  @Delete('staff/:id')
  removeStaff(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dms.removeStaff(user.userId, id);
  }

  // ── Bulk inventory upload ──
  @Post('inventory/bulk')
  @HttpCode(200)
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BulkUploadDto) {
    return this.dms.bulkUpload(user.userId, dto.rows);
  }

  @Post('inventory/bulk-csv')
  @HttpCode(200)
  bulkCsv(@CurrentUser() user: AuthUser, @Body() dto: BulkCsvDto) {
    return this.dms.bulkUploadCsv(user.userId, dto.csv);
  }

  // ── Syndication ──
  @Get('syndication')
  listSyndication(@CurrentUser() user: AuthUser) {
    return this.dms.listSyndication(user.userId);
  }

  @Get('syndication/feed')
  feed(@CurrentUser() user: AuthUser) {
    return this.dms.syndicationFeed(user.userId);
  }

  @Put('syndication/:channel')
  setSyndication(
    @CurrentUser() user: AuthUser,
    @Param('channel') channel: SyndicationChannel,
    @Body() dto: SetSyndicationDto,
  ) {
    return this.dms.setSyndication(user.userId, channel, dto.enabled);
  }
}
