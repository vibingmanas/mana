import { Body, Controller, Get, Ip, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@mana/db';
import { AdminService } from './admin.service';
import { ListDealersQuery, ModerateListingDto, SetDealerStatusDto, SetTierDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('dealers')
  listDealers(@Query() q: ListDealersQuery) {
    return this.admin.listDealers(q.status);
  }

  @Get('dealers/:id')
  getDealer(@Param('id') id: string) {
    return this.admin.getDealer(id);
  }

  @Post('dealers/:id/tier')
  setTier(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetTierDto,
    @Ip() ip: string,
  ) {
    return this.admin.setDealerTier(id, dto.tier, dto.reason, { actorUserId: user.userId, ip });
  }

  @Post('dealers/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SetDealerStatusDto,
    @Ip() ip: string,
  ) {
    return this.admin.setDealerStatus(id, dto.status, dto.reason, { actorUserId: user.userId, ip });
  }

  @Post('listings/:id/moderate')
  moderate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ModerateListingDto,
    @Ip() ip: string,
  ) {
    return this.admin.moderateListing(id, dto.action, dto.reason, { actorUserId: user.userId, ip });
  }

  @Get('audit-log')
  auditLog() {
    return this.admin.auditLog();
  }
}
