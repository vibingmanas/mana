import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { LeadStatus, UserRole } from '@mana/db';
import { DmsService } from './dms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

class UpdateLeadDto {
  @IsOptional() @IsIn(Object.values(LeadStatus)) status?: LeadStatus;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
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
}
